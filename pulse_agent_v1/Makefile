PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
INSTALL ?= install

.PHONY: install uninstall build-release package release test

install:
	@mkdir -p $(BINDIR)
	$(INSTALL) -m 755 pulse-agent $(BINDIR)/pulse-agent
	@echo "Installed pulse-agent to $(BINDIR)/pulse-agent"

uninstall:
	@rm -f $(BINDIR)/pulse-agent
	@echo "Removed $(BINDIR)/pulse-agent"

build-release:
	@rebar3 as prod release

package: build-release
	@echo "Creating package for distribution..."
	@mkdir -p packages
	@cp -r _build/default/rel/pulse_agent_v1 packages/pulse_agent_v1-$(shell rebar3 info vsn 2>/dev/null || echo "1.0.0")
	@echo "Package created at packages/pulse_agent_v1-*/"

release: build-release
	@echo "Release built successfully"

test:
	@rebar3 as test ct

.PHONY: clean

clean:
	@rebar3 clean
