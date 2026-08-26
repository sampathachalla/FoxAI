import asyncio
import time
from typing import Any, Dict, List
from agents.hermes_agent import HermesAgent

BENCHMARK_CASES = [
    {
        "name": "Weather tool invocation",
        "prompt": "What's the weather in Seattle?",
        "expected_tool": "get_weather"
    },
    {
        "name": "Reminder creation",
        "prompt": "Remind me to call Mom at 5 PM",
        "expected_tool": "create_reminder"
    },
    {
        "name": "Math calculation",
        "prompt": "Calculate sqrt(144) + 25 * 4",
        "expected_tool": "calculate"
    }
]

class AgentBenchmark:
    def __init__(self):
        self.agent = HermesAgent()

    async def run_benchmark(self) -> Dict[str, Any]:
        results: List[Dict[str, Any]] = []
        passed = 0

        for case in BENCHMARK_CASES:
            t0 = time.time()
            res = await self.agent.run(case["prompt"])
            duration = round(time.time() - t0, 3)

            tools_called = [t["name"] for t in res.get("toolsExecuted", [])]
            success = case["expected_tool"] in tools_called

            if success:
                passed += 1

            results.append({
                "case": case["name"],
                "passed": success,
                "durationSec": duration,
                "toolsCalled": tools_called,
                "expected": case["expected_tool"]
            })

        return {
            "totalCases": len(BENCHMARK_CASES),
            "passed": passed,
            "accuracy": f"{(passed / len(BENCHMARK_CASES)) * 100:.1f}%",
            "results": results
        }

if __name__ == "__main__":
    bm = AgentBenchmark()
    res = asyncio.run(bm.run_benchmark())
    print(res)
