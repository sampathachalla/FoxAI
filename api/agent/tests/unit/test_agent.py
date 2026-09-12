import asyncio
import unittest
from tools import create_default_registry

class TestHermesAgentSuite(unittest.TestCase):
    def setUp(self):
        self.registry = create_default_registry()

    def test_registry_registration(self):
        tools = self.registry.get_definitions()
        self.assertGreaterEqual(len(tools), 7)
        tool_names = [t["function"]["name"] for t in tools]
        self.assertIn("create_reminder", tool_names)
        self.assertIn("create_note", tool_names)
        self.assertIn("get_weather", tool_names)
        self.assertIn("calculate", tool_names)

    def test_calculator_tool(self):
        async def run_test():
            res = await self.registry.execute("calculate", {"expression": "25 * 4 + 10"})
            self.assertEqual(res.get("result"), 110.0)
        asyncio.run(run_test())

    def test_reminder_tool(self):
        async def run_test():
            res = await self.registry.execute("create_reminder", {"title": "Test Task", "dueTime": "5 PM"})
            self.assertEqual(res.get("status"), "created")
            self.assertEqual(res["reminder"]["title"], "Test Task")
        asyncio.run(run_test())

if __name__ == "__main__":
    unittest.main()
