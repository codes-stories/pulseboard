%%%-------------------------------------------------------------------
%% @doc Normalize OTLP payloads to internal format for Kafka.
%% Converts OTLP JSON (maps) -> internal format suitable for Kafka topics.
%% @end
%%%-------------------------------------------------------------------

-module(pulse_telemetry_normalize).

-export([normalize/2]).

%% @doc Normalize OTLP payload based on type.
%% @spec normalize(traces | metrics | logs | profiles, map()) -> {ok, list(map())} | {error, term()}.
normalize(traces, Payload) ->
    normalize_traces(Payload);
normalize(metrics, Payload) ->
    normalize_metrics(Payload);
normalize(logs, Payload) ->
    normalize_logs(Payload);
normalize(profiles, Payload) ->
    normalize_profiles(Payload).

%% ===================================================================
%% TRACES: OTLP Traces -> Internal Format
%% OTLP Structure: {resourceSpans => [{resource => {}, scopeSpans => [{scope => {}, spans => [...]}]}]}
%% ===================================================================

normalize_traces(#{resourceSpans := ResourceSpans}) when is_list(ResourceSpans) ->
    Spans = lists:flatmap(fun normalize_resource_spans/1, ResourceSpans),
    {ok, Spans};
normalize_traces(_) ->
    {error, {invalid_traces_payload, "missing resourceSpans"}}.

normalize_resource_spans(#{resource := Resource, scopeSpans := ScopeSpans}) when is_list(ScopeSpans) ->
    ResourceAttrs = normalize_attributes(maps:get(attributes, Resource, [])),
    lists:flatmap(fun(#{spans := Spans} = ScopeSpan) ->
        ScopeAttrs = normalize_attributes(maps:get(scope, ScopeSpan, #{})),
        lists:map(fun(Span) -> normalize_span(Span, ResourceAttrs, ScopeAttrs) end, Spans)
    end, ScopeSpans);
normalize_resource_spans(_) ->
    [].

normalize_span(Span, ResourceAttrs, ScopeAttrs) ->
    Timestamp = maps:get(startTimeUnixNano, Span, 0),
    #{ 
        type => <<"span">>,
        trace_id => normalize_trace_id(maps:get(traceId, Span, <<>>)),
        span_id => normalize_span_id(maps:get(spanId, Span, <<>>)),
        parent_span_id => normalize_span_id(maps:get(parentSpanId, Span, <<>>)),
        name => maps:get(name, Span, <<>>),
        kind => span_kind_to_atom(maps:get(kind, Span, 0)),
        start_time_unix_nano => Timestamp,
        end_time_unix_nano => maps:get(endTimeUnixNano, Span, Timestamp),
        attributes => normalize_attributes(maps:get(attributes, Span, [])),
        resource_attributes => ResourceAttrs,
        scope_attributes => ScopeAttrs,
        events => normalize_events(maps:get(events, Span, [])),
        links => normalize_links(maps:get(links, Span, [])),
        status => normalize_status(maps:get(status, Span, #{})),
        received_at => erlang:system_time(millisecond)
    }.

normalize_trace_id(<<>>) -> <<>>;
normalize_trace_id(Id) when is_binary(Id), byte_size(Id) == 16 -> Id;
normalize_trace_id(Id) when is_binary(Id) -> Id.

normalize_span_id(<<>>) -> <<>>;
normalize_span_id(Id) when is_binary(Id), byte_size(Id) == 8 -> Id;
normalize_span_id(Id) when is_binary(Id) -> Id.

span_kind_to_atom(0) -> unspecified;
span_kind_to_atom(1) -> internal;
span_kind_to_atom(2) -> server;
span_kind_to_atom(3) -> client;
span_kind_to_atom(4) -> producer;
span_kind_to_atom(5) -> consumer;
span_kind_to_atom(_) -> unspecified.

normalize_events([]) -> [];
normalize_events(Events) when is_list(Events) ->
    [normalize_event(E) || E <- Events].

normalize_event(#{timeUnixNano := Time, name := Name, attributes := Attrs}) ->
    #{time_unix_nano => Time, name => Name, attributes => normalize_attributes(Attrs)}.

normalize_links([]) -> [];
normalize_links(Links) when is_list(Links) ->
    [normalize_link(L) || L <- Links].

normalize_link(#{traceId := TraceId, spanId := SpanId, attributes := Attrs}) ->
    #{trace_id => normalize_trace_id(TraceId), span_id => normalize_span_id(SpanId), attributes => normalize_attributes(Attrs)}.

normalize_status(#{code := Code, message := Message}) ->
    #{code => status_code_to_atom(Code), message => Message}.

status_code_to_atom(0) -> unset;
status_code_to_atom(1) -> ok;
status_code_to_atom(2) -> error;
status_code_to_atom(_) -> unset.

%% ===================================================================
%% METRICS: OTLP Metrics -> Internal Format
%% OTLP Structure: {resourceMetrics => [{resource => {}, scopeMetrics => [{scope => {}, metrics => [...]}]}]}
%% ===================================================================

normalize_metrics(#{resourceMetrics := ResourceMetrics}) when is_list(ResourceMetrics) ->
    Metrics = lists:flatmap(fun normalize_resource_metrics/1, ResourceMetrics),
    {ok, Metrics};
normalize_metrics(_) ->
    {error, {invalid_metrics_payload, "missing resourceMetrics"}}.

normalize_resource_metrics(#{resource := Resource, scopeMetrics := ScopeMetrics}) when is_list(ScopeMetrics) ->
    ResourceAttrs = normalize_attributes(maps:get(attributes, Resource, [])),
    lists:flatmap(fun(#{metrics := Metrics} = ScopeMetric) ->
        ScopeAttrs = normalize_attributes(maps:get(scope, ScopeMetric, #{})),
        lists:map(fun(M) -> normalize_metric(M, ResourceAttrs, ScopeAttrs) end, Metrics)
    end, ScopeMetrics).

normalize_metric(Metric, ResourceAttrs, ScopeAttrs) ->
    Base = #{
        type => <<"metric">>,
        name => maps:get(name, Metric, <<>>),
        description => maps:get(description, Metric, <<>>),
        unit => maps:get(unit, Metric, <<>>),
        resource_attributes => ResourceAttrs,
        scope_attributes => ScopeAttrs,
        received_at => erlang:system_time(millisecond)
    },
    case maps:get(data, Metric) of
        #{gauge := #{dataPoints := Points}} ->
            [Base#{type => <<"gauge">>, data_point => normalize_number_dp(DP, gauge)} || DP <- Points];
        #{sum := #{dataPoints := Points, aggregationTemporality := Temp, isMonotonic := Mono}} ->
            [Base#{type => <<"sum">>, data_point => normalize_number_dp(DP, sum), aggregation_temporality => Temp, is_monotonic => Mono} || DP <- Points];
        #{histogram := #{dataPoints := Points, aggregationTemporality := Temp}} ->
            [Base#{type => <<"histogram">>, data_point => normalize_histogram_dp(DP), aggregation_temporality => Temp} || DP <- Points];
        #{exponentialHistogram := #{dataPoints := Points, aggregationTemporality := Temp}} ->
            [Base#{type => <<"exponential_histogram">>, data_point => normalize_exp_histogram_dp(DP), aggregation_temporality => Temp} || DP <- Points];
        _ ->
            [Base#{type => <<"unknown">>}]
    end.

normalize_number_dp(#{attributes := Attrs, startTimeUnixNano := Start, timeUnixNano := Time, value := Value}, Type) ->
    #{attributes => normalize_attributes(Attrs), start_time_unix_nano => Start, time_unix_nano => Time, value => Value, metric_type => Type}.

normalize_histogram_dp(#{attributes := Attrs, startTimeUnixNano := Start, timeUnixNano := Time, count := Count, sum := Sum, bucketCounts := Counts, explicitBounds := Bounds}) ->
    #{attributes => normalize_attributes(Attrs), start_time_unix_nano => Start, time_unix_nano => Time, count => Count, sum => Sum, bucket_counts => Counts, explicit_bounds => Bounds}.

normalize_exp_histogram_dp(#{attributes := Attrs, startTimeUnixNano := Start, timeUnixNano := Time, count := Count, sum := Sum, scale := Scale, zeroCount := ZeroCount, positive := Pos, negative := Neg}) ->
    #{attributes => normalize_attributes(Attrs), start_time_unix_nano => Start, time_unix_nano => Time, count => Count, sum => Sum, scale => Scale, zero_count => ZeroCount, positive => Pos, negative => Neg}.

%% ===================================================================
%% LOGS: OTLP Logs -> Internal Format
%% OTLP Structure: {resourceLogs => [{resource => {}, scopeLogs => [{scope => {}, logRecords => [...]}]}]}
%% ===================================================================

normalize_logs(#{resourceLogs := ResourceLogs}) when is_list(ResourceLogs) ->
    Records = lists:flatmap(fun normalize_resource_logs/1, ResourceLogs),
    {ok, Records};
normalize_logs(_) ->
    {error, {invalid_logs_payload, "missing resourceLogs"}}.

normalize_resource_logs(#{resource := Resource, scopeLogs := ScopeLogs}) when is_list(ScopeLogs) ->
    ResourceAttrs = normalize_attributes(maps:get(attributes, Resource, [])),
    lists:flatmap(fun(#{logRecords := Records} = ScopeLog) ->
        ScopeAttrs = normalize_attributes(maps:get(scope, ScopeLog, #{})),
        lists:map(fun(Record) -> normalize_log_record(Record, ResourceAttrs, ScopeAttrs) end, Records)
    end, ScopeLogs).

normalize_log_record(Record, ResourceAttrs, ScopeAttrs) ->
    #{ 
        type => <<"log">>,
        time_unix_nano => maps:get(timeUnixNano, Record, 0),
        observed_time_unix_nano => maps:get(observedTimeUnixNano, Record, 0),
        severity_number => maps:get(severityNumber, Record, 9),
        severity_text => maps:get(severityText, Record, <<>>),
        body => normalize_body(maps:get(body, Record, <<>>)),
        attributes => normalize_attributes(maps:get(attributes, Record, [])),
        resource_attributes => ResourceAttrs,
        scope_attributes => ScopeAttrs,
        trace_id => normalize_trace_id(maps:get(traceId, Record, <<>>)),
        span_id => normalize_span_id(maps:get(spanId, Record, <<>>)),
        flags => maps:get(flags, Record, 0),
        received_at => erlang:system_time(millisecond)
    }.

normalize_body(#{stringValue := Val}) -> Val;
normalize_body(#{bytesValue := Val}) -> Val;
normalize_body(#{intValue := Val}) -> integer_to_binary(Val);
normalize_body(#{doubleValue := Val}) -> float_to_binary(Val);
normalize_body(#{boolValue := Val}) -> case Val of true -> <<"true">>; false -> <<"false">> end;
normalize_body(#{arrayValue := #{values := Vals}}) -> jiffy:encode([normalize_body(V) || V <- Vals]);
normalize_body(#{kvlistValue := #{values := Vals}}) -> jiffy:encode([#{K => normalize_body(V)} || #{key := K, value := V} <- Vals]);
normalize_body(Val) when is_binary(Val) -> Val;
normalize_body(Val) -> jiffy:encode(Val).

%% ===================================================================
%% PROFILES: OTLP Profiles -> Internal Format
%% ===================================================================

normalize_profiles(#{resourceProfiles := ResourceProfiles}) when is_list(ResourceProfiles) ->
    Profiles = lists:flatmap(fun normalize_resource_profiles/1, ResourceProfiles),
    {ok, Profiles};
normalize_profiles(_) ->
    {error, {invalid_profiles_payload, "missing resourceProfiles"}}.

normalize_resource_profiles(#{resource := Resource, scopeProfiles := ScopeProfiles}) when is_list(ScopeProfiles) ->
    ResourceAttrs = normalize_attributes(maps:get(attributes, Resource, [])),
    lists:flatmap(fun(#{profiles := Profiles} = ScopeProfile) ->
        ScopeAttrs = normalize_attributes(maps:get(scope, ScopeProfile, #{})),
        lists:map(fun(P) -> normalize_profile(P, ResourceAttrs, ScopeAttrs) end, Profiles)
    end, ScopeProfiles).

normalize_profile(Profile, ResourceAttrs, ScopeAttrs) ->
    #{ 
        type => <<"profile">>,
        profile_id => maps:get(profileId, Profile, <<>>),
        start_time_unix_nano => maps:get(startTimeUnixNano, Profile, 0),
        end_time_unix_nano => maps:get(endTimeUnixNano, Profile, 0),
        attributes => normalize_attributes(maps:get(attributes, Profile, [])),
        resource_attributes => ResourceAttrs,
        scope_attributes => ScopeAttrs,
        sample => normalize_sample(maps:get(sample, Profile, #{})),
        mapping => normalize_mapping(maps:get(mapping, Profile, #{})),
        locations => normalize_locations(maps:get(locations, Profile, [])),
        received_at => erlang:system_time(millisecond)
    }.

normalize_sample(#{locations := Locs, values := Vals, labelIndices := Indices}) ->
    #{locations => Locs, values => Vals, label_indices => Indices}.

normalize_mapping(#{functions := Funcs, locations := Locs, attributes := Attrs}) ->
    #{functions => [normalize_function(F) || F <- Funcs], locations => Locs, attributes => normalize_attributes(Attrs)}.

normalize_function(#{id := Id, name := Name, systemName := SysName, fileName := File, startLine := Line}) ->
    #{id => Id, name => Name, system_name => SysName, file_name => File, start_line => Line}.

normalize_locations([]) -> [];
normalize_locations(Locs) ->
    [#{id => maps:get(id, L), mapping => maps:get(mapping, L), address => maps:get(address, L)} || L <- Locs].

%% ===================================================================
%% HELPERS
%% ===================================================================

normalize_attributes([]) -> #{};
normalize_attributes(Attrs) when is_list(Attrs) ->
    lists:foldl(fun(A, Acc) -> maps:put(element(1, normalize_attr(A)), element(2, normalize_attr(A)), Acc) end, #{}, Attrs).

normalize_attr(#{key := K, value := #{stringValue := V}}) -> {K, V};
normalize_attr(#{key := K, value := #{intValue := V}}) -> {K, integer_to_binary(V)};
normalize_attr(#{key := K, value := #{doubleValue := V}}) -> {K, float_to_binary(V)};
normalize_attr(#{key := K, value := #{boolValue := V}}) -> {K, case V of true -> <<"true">>; false -> <<"false">> end};
normalize_attr(#{key := K, value := #{bytesValue := V}}) -> {K, V};
normalize_attr(#{key := K, value := #{arrayValue := #{values := Vals}}}) -> {K, jiffy:encode([normalize_body(V) || V <- Vals])};
normalize_attr(#{key := K, value := #{kvlistValue := #{values := Vals}}}) -> {K, jiffy:encode([#{K2 => normalize_body(V2)} || #{key := K2, value := V2} <- Vals])};
normalize_attr(_) -> {<<>>, <<>>}.