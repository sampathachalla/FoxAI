import os
import unittest
from unittest.mock import patch

from integrations.agent_reach.config import (
    agent_reach_enabled,
    deep_result_limit,
    quick_result_limit,
    system_prompt_hint,
)
from integrations.agent_reach.runtime import is_agent_reach_tool_event


class AgentReachConfigTests(unittest.TestCase):
    def test_disabled_removes_prompt_hint(self):
        with patch.dict(os.environ, {"AGENT_REACH_ENABLED": "false"}, clear=False):
            self.assertFalse(agent_reach_enabled())
            self.assertEqual(system_prompt_hint(), "")

    def test_quick_and_deep_limits_are_configurable(self):
        with patch.dict(
            os.environ,
            {
                "AGENT_REACH_ENABLED": "true",
                "AGENT_REACH_QUICK_RESULTS": "4",
                "AGENT_REACH_DEEP_RESULTS": "9",
            },
            clear=False,
        ):
            self.assertEqual(quick_result_limit(), 4)
            self.assertEqual(deep_result_limit(), 9)
            hint = system_prompt_hint()
            self.assertIn("QUICK", hint)
            self.assertIn("DEEP", hint)
            self.assertIn("at most 4", hint)
            self.assertIn("up to 9", hint)


class AgentReachRuntimeTests(unittest.TestCase):
    def test_detects_exa_terminal_command(self):
        self.assertTrue(
            is_agent_reach_tool_event(
                "terminal",
                {"command": 'mcporter call exa.web_search_exa query="livekit" numResults=5'},
            )
        )

    def test_detects_agent_reach_cli(self):
        self.assertTrue(
            is_agent_reach_tool_event("terminal", {"command": "agent-reach doctor --json"})
        )

    def test_does_not_mark_unrelated_tool(self):
        self.assertFalse(
            is_agent_reach_tool_event("read_file", {"path": "/tmp/example.txt"})
        )


if __name__ == "__main__":
    unittest.main()
