import asyncio
import unittest

from tools import calculate, create_reminder


class TestFoxTools(unittest.TestCase):
    def test_calculator_tool(self):
        res = calculate("25 * 4 + 10")
        self.assertEqual(res.get("result"), 110.0)

    def test_reminder_tool(self):
        res = create_reminder(title="Test Task", dueTime="5 PM")
        self.assertEqual(res.get("status"), "created")
        self.assertEqual(res["reminder"]["title"], "Test Task")


class TestMCPServer(unittest.TestCase):
    def test_tools_are_exposed_over_mcp(self):
        from main import server

        tools = {t.name: t for t in asyncio.run(server.list_tools())}
        self.assertEqual(
            set(tools),
            {"create_reminder", "create_note", "control_device", "calculate", "get_system_status"},
        )
        priority = tools["create_reminder"].input_schema["properties"]["priority"]
        self.assertEqual(priority.get("enum"), ["low", "medium", "high"])
        self.assertEqual(tools["calculate"].input_schema["required"], ["expression"])


if __name__ == "__main__":
    unittest.main()
