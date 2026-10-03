import math
from typing import Any, Dict


def calculate(expression: str) -> Dict[str, Any]:
    """Performs mathematical, scientific, or percentage computations safely.

    Args:
        expression: Arithmetic or math expression to evaluate.
    """
    try:
        allowed = {"math": math, "sqrt": math.sqrt, "pi": math.pi, "sin": math.sin, "cos": math.cos, "pow": math.pow}
        clean_expr = expression.replace("^", "**").replace("%", "/100")
        result = eval(clean_expr, {"__builtins__": {}}, allowed)
        return {"expression": expression, "result": float(result), "formatted": f"{expression} = {result}"}
    except Exception as e:
        return {"expression": expression, "error": f"Calculation error: {str(e)}"}
