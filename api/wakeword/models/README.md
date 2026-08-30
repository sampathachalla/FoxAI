By default the wake-word service now uses OpenWakeWord's built-in `Hey Jarvis` model and does not require any local ONNX file.

If you later want a custom model, place it in this directory and point `WAKEWORD_MODEL_PATH` at it.

Example:

`api/wakeword/models/custom_wakeword.onnx`
