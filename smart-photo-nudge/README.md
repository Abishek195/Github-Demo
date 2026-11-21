# Smart Photo Nudge (prototype)

A single-file prototype of an improved "Send photo?" nudge for business support chats.
Claude decides when a photo would help, asks for the specific shot the agent needs,
and checks the photo before it is sent.

Open `index.html` in a browser. When Claude isn't available (for example, opened locally),
keyword rules run the demo. Claude calls work when the page is opened as a claude.ai
artifact with the `sample` capability (images enabled).

## What it improves over a static "Send photo?" chip

| Today | Prototype |
|---|---|
| Shown regardless of the conversation | Shown only when Claude judges a photo will help (yes/no + confidence) |
| Generic "Send photo?" | Specific ask: "Photo of the size label?", "Screenshot of the error?" |
| No guidance | Capture checklist tailored to the issue |
| No check before sending | Claude checks relevance, blur/lighting and privacy (addresses, card numbers) and can suggest a retake |
| Customer types context by hand | Caption drafted for the agent |
| × just hides it once | × silences it for the rest of the chat |

## Flow

1. The customer sends a message, and Claude (quick tier) returns JSON:
   `show, confidence, photo_type, nudge_text, why, checklist, suggested_caption`.
2. The nudge pill shows the tailored text. Tapping it opens a capture guide (camera, gallery or sample photo).
3. The selected image goes to Claude (vision), which returns `verdict, relevant, shows, quality, issues, privacy, caption`.
4. The customer sends the photo with the caption, or retakes it.

Stridewell Sneakers is a fictional business used for the demo.
