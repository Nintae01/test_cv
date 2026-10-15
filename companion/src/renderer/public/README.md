# Runtime files you have to download yourself

Both are licensed by Live2D Inc. and cannot be redistributed with this repo.

1. **Cubism Core** – `live2dcubismcore.min.js`
   Download the Cubism SDK for Web from https://www.live2d.com/sdk/download/web/ and copy
   `Core/live2dcubismcore.min.js` into this folder, right next to this README.

2. **A model** – put a Cubism 3/4 model folder under `model/` so that the `.model3.json` is at
   the path you set in `LIVE2D_MODEL_URL` (default `/model/hiyori/hiyori.model3.json`).
   The SDK download above includes free samples (Hiyori, Haru, Mao, …) in `Samples/Resources/`.
   Paid models: https://nizima.com or https://booth.pm (search "Live2D model").

Without these the app still runs and shows a placeholder blob so you can test everything else.
