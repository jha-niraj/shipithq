
# Sandbox (plan/ai-build AB-4): each command the candidate types is sent to the agent, which
# records it. Claude's own commands arrive through its hooks instead.
__sbx_log() {
    local c
    c=$(HISTTIMEFORMAT= history 1 | sed 's/^ *[0-9]* *//')
    if [ -n "$c" ] && [ "$c" != "$__sbx_last" ]; then
        __sbx_last="$c"
        ( curl -s -m 1 -X POST --data-binary "$c" http://127.0.0.1:8080/command >/dev/null 2>&1 & )
    fi
}
PROMPT_COMMAND="__sbx_log${PROMPT_COMMAND:+;$PROMPT_COMMAND}"
cd /workspace 2>/dev/null
