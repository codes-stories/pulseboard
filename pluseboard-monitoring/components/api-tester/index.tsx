"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, PanelLeft, Play, Save, Sparkles, X } from "lucide-react";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import type { APITest, PayloadExample, ProxyResponse } from "@/lib/types";
import { executeApiRequest, RequestExecutionError, type ExecutionMode } from "@/lib/api-execution";
import { useAuth } from "@/components/auth-provider";
import type { HistoryEntry, KVRow, RequestState, SendError } from "./workspace-types";
import {
  byteLength,
  defaultRequest,
  encodeBody,
  headersObject,
  isJSON,
  newID,
  objectToRows,
  parsePathParamsFromURL,
  parseQueryIntoParams,
  buildApiRequest,
  urlFromQuery,
} from "./helpers";
import { RequestBuilder, type RequestTab } from "./request-builder";
import { ResponseViewer } from "./response-viewer";
import { HistorySidebar } from "./history-sidebar";

const MAX_HISTORY = 50;
const STORAGE_HISTORY = "pb-api-history";
const STORAGE_HISTORY_WIDTH = "pb-api-hw";
const STORAGE_RESPONSE_WIDTH = "pb-api-rw";
const STORAGE_HISTORY_OPEN = "pb-api-historyopen";
const STORAGE_EXECUTION_MODE = "pb-api-mode";

type ResponseTab = "body" | "headers" | "cookies" | "raw" | "preview";

function message(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) {
    return "Network error: could not reach the server. The server may be offline, or the request was blocked by the browser (CORS).";
  }
  return "Something went wrong. Please try again.";
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // ignore corrupt storage
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function ApiWorkspace() {
  const { status: authStatus } = useAuth();
  const authenticated = authStatus === "authenticated";
  const queryClient = useQueryClient();

  const [request, setRequest] = useState<RequestState>(defaultRequest);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<SendError | null>(null);
  const [allowPrivate, setAllowPrivate] = useState(false);
  const [requestTab, setRequestTab] = useState<RequestTab>("params");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [lastExample, setLastExample] = useState<unknown | undefined>(undefined);
  const controllerRef = useRef<AbortController | null>(null);

  const [executionMode, setExecutionModeState] = useState<ExecutionMode>(() =>
    loadJSON<ExecutionMode>(STORAGE_EXECUTION_MODE, "direct"),
  );
  const executionModeRef = useRef<ExecutionMode>(executionMode);
  const setExecutionMode = useCallback((mode: ExecutionMode) => {
    executionModeRef.current = mode;
    setExecutionModeState(mode);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_EXECUTION_MODE, executionMode);
  }, [executionMode]);

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadJSON<HistoryEntry[]>(STORAGE_HISTORY, []));
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState<boolean>(() => loadJSON<boolean>(STORAGE_HISTORY_OPEN, true));
  const [historyWidth, setHistoryWidth] = useState<number>(() => loadJSON<number>(STORAGE_HISTORY_WIDTH, 300));
  const [responseWidth, setResponseWidth] = useState<number>(() => loadJSON<number>(STORAGE_RESPONSE_WIDTH, 480));
  const [dragging, setDragging] = useState<null | "history" | "response">(null);
  const [isWide, setIsWide] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [testName, setTestName] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAIResult] = useState<{ provider: string; examples: PayloadExample[] } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
    } catch {
      // storage may be full; ignore
    }
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_HISTORY_WIDTH, String(historyWidth));
    window.localStorage.setItem(STORAGE_RESPONSE_WIDTH, String(responseWidth));
    window.localStorage.setItem(STORAGE_HISTORY_OPEN, String(historyOpen));
  }, [historyWidth, responseWidth, historyOpen]);

  const update = useCallback((patch: Partial<RequestState>) => {
    setRequest((previous) => ({ ...previous, ...patch }));
    setActiveHistoryId(null);
  }, []);

  const setURL = useCallback((url: string) => {
    setRequest((previous) => ({
      ...previous,
      url,
      query: parseQueryIntoParams(url),
      pathParams: parsePathParamsFromURL(url, previous.pathParams),
    }));
    setActiveHistoryId(null);
  }, []);

  const updateQuery = useCallback((rows: KVRow[]) => {
    setRequest((previous) => ({ ...previous, query: rows, url: urlFromQuery(previous.url, rows) }));
    setActiveHistoryId(null);
  }, []);

  const updatePathParams = useCallback((rows: KVRow[]) => {
    setRequest((previous) => ({ ...previous, pathParams: rows }));
    setActiveHistoryId(null);
  }, []);

  const requestRef = useRef(request);
  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  const pushHistory = useCallback((entry: Omit<HistoryEntry, "id" | "timestamp" | "request">, snapshot: RequestState) => {
    setHistory((previous) => {
      const next: HistoryEntry = {
        ...entry,
        id: newID(),
        timestamp: Date.now(),
        request: structuredClone(snapshot),
      };
      return [next, ...previous].slice(0, MAX_HISTORY);
    });
  }, []);

  const sendWith = useCallback(
    async (override: RequestState | null) => {
      const current = override ?? requestRef.current;
      if (!current.url.trim()) {
        setSendError({ message: "Enter a URL to test.", cors: false });
        return;
      }
      setSendError(null);
      setSending(true);
      setActiveHistoryId(null);
      const controller = new AbortController();
      controllerRef.current = controller;
      const built = buildApiRequest(current);
      try {
        const result = await executeApiRequest(
          { ...built, allow_private: allowPrivate },
          executionModeRef.current,
          controller.signal,
        );
        setResponse(result);
        setReceivedAt(Date.now());
        setLastExample(encodeBody(current.body.text));
        pushHistory(
          { method: built.method, url: built.url, status: result.status, duration_ms: result.duration_ms, size: byteLength(result.body) },
          current,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          setSendError({ message: "Request cancelled.", cors: false });
        } else {
          setResponse(null);
          setReceivedAt(null);
          if (error instanceof RequestExecutionError) {
            setSendError({ message: error.message, cors: error.corsBlocked });
          } else {
            setSendError({ message: message(error), cors: false });
          }
        }
        pushHistory({ method: built.method, url: built.url }, current);
      } finally {
        setSending(false);
        controllerRef.current = null;
      }
    },
    [pushHistory, allowPrivate],
  );

  const send = useCallback(() => {
    void sendWith(null);
  }, [sendWith]);

  const retry = useCallback(() => {
    setSendError(null);
    void sendWith(null);
  }, [sendWith]);

  const switchToProxy = useCallback(() => {
    setExecutionMode("proxy");
    setSendError(null);
    void sendWith(null);
  }, [sendWith, setExecutionMode]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  function selectHistory(entry: HistoryEntry) {
    setRequest(structuredClone(entry.request));
    setActiveHistoryId(entry.id);
    setResponse(null);
    setReceivedAt(null);
    setSendError(null);
    if (!isWide) setHistoryOpen(false);
  }

  function clearHistory() {
    if (window.confirm("Clear all request history?")) {
      setHistory([]);
      toast.success("History cleared");
    }
  }

  function startResize(which: "history" | "response") {
    return (event: React.PointerEvent) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = which === "history" ? historyWidth : responseWidth;
      setDragging(which);

      const onMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        if (which === "history") {
          setHistoryWidth(clamp(startWidth + delta, 220, 420));
        } else {
          setResponseWidth(clamp(startWidth - delta, 360, 1000));
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDragging(null);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        void send();
      }
      if (event.key === "Escape") {
        setAiOpen(false);
        setSaveOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [send]);

  const savedQuery = useQuery({
    queryKey: ["api-tests"],
    queryFn: api.listAPITests,
    enabled: authenticated,
  });

  const saveMutation = useMutation({
    mutationFn: (name: string) =>
      api.createAPITest({
        name,
        method: request.method,
        url: request.url,
        headers: headersObject(request.headers),
        body: request.body.text,
        response_status: response?.status,
        response_body: response?.body ?? "",
        response_time_ms: response ? Number(response.duration_ms) : undefined,
      }),
    onSuccess: () => {
      toast.success("API test saved");
      setSaveOpen(false);
      setTestName("");
      queryClient.invalidateQueries({ queryKey: ["api-tests"] });
    },
    onError: (error) => toast.error(message(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAPITest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-tests"] });
      toast.success("API test deleted");
    },
    onError: (error) => toast.error(message(error)),
  });

  function loadSaved(test: APITest) {
    setRequest((previous) => ({
      ...previous,
      method: test.method,
      url: test.url,
      query: parseQueryIntoParams(test.url),
      pathParams: parsePathParamsFromURL(test.url, previous.pathParams),
      headers: objectToRows(test.headers),
      body: { type: isJSON(test.body) ? "json" : "text", text: test.body },
    }));
    setActiveHistoryId(null);
    setRequestTab("body");
    setResponseTab("body");
    setSendError(null);
    if (test.response_status) {
      setResponse({
        status: test.response_status,
        status_text: String(test.response_status),
        headers: {},
        body: test.response_body,
        duration_ms: test.response_time_ms ?? 0,
      });
      setReceivedAt(Date.now());
    } else {
      setResponse(null);
      setReceivedAt(null);
    }
  }

  async function generate() {
    setAiLoading(true);
    setAiError(null);
    setAiOpen(true);
    try {
      const result = await api.generatePayloads({
        method: request.method,
        url: request.url,
        example: lastExample ?? encodeBody(request.body.text),
        count: 3,
      });
      setAIResult(result);
    } catch (error) {
      setAiError(message(error));
    } finally {
      setAiLoading(false);
    }
  }

  function applyExample(example: PayloadExample) {
    setRequest((previous) => ({
      ...previous,
      body: {
        type: "json",
        text: typeof example.payload === "string" ? example.payload : JSON.stringify(example.payload, null, 2),
      },
    }));
    setRequestTab("body");
  }

  async function sendExample(example: PayloadExample) {
    applyExample(example);
    setAiOpen(false);
    const nextRequest: RequestState = {
      ...requestRef.current,
      body: {
        type: "json",
        text: typeof example.payload === "string" ? example.payload : JSON.stringify(example.payload, null, 2),
      },
    };
    void sendWith(nextRequest);
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-[color:var(--bg)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--border)] bg-[color:var(--card-soft)] px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <button
            className="icon-btn"
            type="button"
            title={historyOpen ? "Hide history" : "Show history"}
            aria-pressed={historyOpen}
            onClick={() => setHistoryOpen((value) => !value)}
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <p className="hidden font-mono text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[color:var(--faint)] md:block">
            Request workspace
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button className="btn btn-ghost text-sm" type="button" title="Generate similar payloads from the last request" onClick={() => void generate()} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate
          </button>

          <div className="relative">
            <button
              className="btn btn-secondary text-sm"
              type="button"
              title={authenticated ? "Save this request as an API test" : "Sign in to save API tests"}
              onClick={() => setSaveOpen((value) => !value)}
            >
              <Save className="h-4 w-4" /> Save
            </button>

            {saveOpen ? (
              <div className="absolute right-0 top-full z-50 mt-1.5 w-72">
                <div className="workspace-panel p-3">
                  {authenticated ? (
                    <>
                      <p className="text-sm font-bold">Save API test</p>
                      <p className="mt-1 text-[0.74rem] text-[color:var(--muted)]">Stores the request and last response for replay.</p>
                      <div className="mt-3 flex gap-2">
                        <input
                          className="input-field min-w-0 flex-1 text-[0.82rem]"
                          value={testName}
                          placeholder="Name, e.g. create order"
                          onChange={(event) => setTestName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && testName.trim()) saveMutation.mutate(testName.trim());
                          }}
                        />
                        <button
                          className="btn btn-primary shrink-0 text-sm"
                          type="button"
                          disabled={saveMutation.isPending || !testName.trim()}
                          onClick={() => saveMutation.mutate(testName.trim())}
                        >
                          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save
                        </button>
                      </div>
                      {saveMutation.isError ? <p className="mt-2 text-[0.74rem] text-[color:var(--danger)]">{message(saveMutation.error)}</p> : null}
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold">Sign in to save tests</p>
                      <p className="mt-1 text-[0.74rem] text-[color:var(--muted)]">Save API test requests and their responses, then replay them whenever you need.</p>
                      <div className="mt-3 grid gap-2">
                        <a href="/login" className="btn btn-primary w-full justify-center text-sm">Sign in</a>
                        <a href="/register" className="btn btn-secondary w-full justify-center text-sm">Create account</a>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-2 lg:flex-row">
        {historyOpen && isWide ? (
          <>
            <div className="hidden min-h-0 shrink-0 lg:block" style={{ width: historyWidth }}>
              <HistorySidebar
                history={history}
                activeId={activeHistoryId}
                onSelect={selectHistory}
                authenticated={authenticated}
                savedTests={savedQuery.data ?? []}
                savedLoading={savedQuery.isLoading}
                onLoadSaved={loadSaved}
                onDeleteSaved={(id) => void deleteMutation.mutate(id)}
                onClearHistory={clearHistory}
                onCloseMobile={() => setHistoryOpen(false)}
              />
            </div>
            <div
              className="resizer hidden lg:block"
              data-active={dragging === "history" || undefined}
              onPointerDown={startResize("history")}
            />
          </>
        ) : null}

        {historyOpen && !isWide ? (
          <>
            <div className="drawer-backdrop lg:hidden" onClick={() => setHistoryOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-40 w-72 p-2 pt-[4.5rem] lg:hidden">
              <HistorySidebar
                history={history}
                activeId={activeHistoryId}
                onSelect={selectHistory}
                authenticated={authenticated}
                savedTests={savedQuery.data ?? []}
                savedLoading={savedQuery.isLoading}
                onLoadSaved={loadSaved}
                onDeleteSaved={(id) => void deleteMutation.mutate(id)}
                onClearHistory={clearHistory}
                onCloseMobile={() => setHistoryOpen(false)}
              />
            </aside>
          </>
        ) : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col max-lg:min-h-[52vh]">
          <RequestBuilder
            request={request}
            update={update}
            updateQuery={updateQuery}
            updatePathParams={updatePathParams}
            setURL={setURL}
            tab={requestTab}
            onTabChange={setRequestTab}
            sending={sending}
            sendError={sendError}
            mode={executionMode}
            onModeChange={setExecutionMode}
            allowPrivate={allowPrivate}
            onAllowPrivateChange={setAllowPrivate}
            onSend={() => void send()}
            onCancel={cancel}
            onRetry={() => void retry()}
            onSwitchToProxy={() => void switchToProxy()}
            onDismissError={() => setSendError(null)}
          />
        </div>

        {isWide ? (
          <div className="resizer hidden lg:block" data-active={dragging === "response" || undefined} onPointerDown={startResize("response")} />
        ) : null}

        <div
          className="flex min-h-0 min-w-0 flex-col border-l border-[color:var(--border)] max-lg:min-h-[48vh]"
          style={isWide ? { width: responseWidth } : undefined}
        >
          <ResponseViewer
            response={response}
            sending={sending}
            requestMethod={request.method}
            requestURL={request.url}
            receivedAt={receivedAt}
            mode={executionMode}
            tab={responseTab}
            onTabChange={setResponseTab}
          />
        </div>
      </div>

      {aiOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="drawer-backdrop" onClick={() => setAiOpen(false)} />
          <div className="workspace-panel relative z-10 max-h-[82vh] w-full max-w-xl">
            <div className="workspace-panel-header">
              <p className="font-mono text-[0.72rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">Generate similar payloads</p>
              <button className="icon-btn" type="button" title="Close" onClick={() => setAiOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="thin-scroll overflow-y-auto p-3">
              {aiLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="skeleton h-24 rounded-md" />
                  ))}
                </div>
              ) : aiError ? (
                <div className="rounded-md border border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-4 py-3 text-sm text-[color:var(--danger)]">
                  {aiError}
                </div>
              ) : aiResult ? (
                <>
                  <p className="mb-3 text-[0.68rem] font-bold uppercase tracking-wider text-[color:var(--faint)]">
                    {aiResult.provider === "ai" ? "Generated by AI" : "Generated locally"} · {aiResult.examples.length} examples
                  </p>
                  <div className="space-y-2">
                    {aiResult.examples.map((example, index) => (
                      <div key={`${example.name}-${index}`} className="rounded-md border border-[color:var(--border)] p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-bold">{example.name}</p>
                          <div className="flex gap-1.5">
                            <button className="btn btn-ghost text-sm" type="button" title="Copy example into the request body" onClick={() => applyExample(example)}>
                              Use
                            </button>
                            <button className="btn btn-secondary text-sm" type="button" title="Use and send" onClick={() => void sendExample(example)}>
                              <Play className="h-3.5 w-3.5" /> Send
                            </button>
                          </div>
                        </div>
                        <pre className="thin-scroll mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-md border border-white/5 bg-[color:var(--code-bg)] px-3 py-2 font-mono text-[0.72rem] text-[color:var(--nav-text)]">
                          {typeof example.payload === "string" ? example.payload : JSON.stringify(example.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}