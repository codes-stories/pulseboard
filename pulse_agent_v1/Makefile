PREFIX ?= $(HOME)/.local
BINDIR ?= $(PREFIX)/bin
INSTALL ?= install

.PHONY: install uninstall

install:
	@mkdir -p $(BINDIR)
	$(INSTALL) -m 755 pulse-agent $(BINDIR)/pulse-agent
	@echo "Installed pulse-agent to $(BINDIR)/pulse-agent"

uninstall:
	@rm -f $(BINDIR)/pulse-agent
	@echo "Removed $(BINDIR)/pulse-agent"
