# app-20 Overview

Initial ideas for this application, a desktop and iOS LLM chat app (similar to the main frontier ones e.g. Claude, Gemini, ChatGPT, Grok). 

This app will work with OpenAI APIs such as Openrouter, and will store the chats/conversations on S3 both plain text and encrypted.

Below are thoughts for an initial beta phase, a proof of concept.

## Tech

- React
- React Native for iOS
- Electron for desktop
- A separate Chat/Conversation React component will be created, in this repository for now but later moved to another repository. See @react-component-overview.md

## Product

- A single-user AI chat application for personal use.
- Initial platforms: iOS and Windows desktop.
- Future platforms are out of scope.
- No accounts or login flow.
- React Native application using TypeScript and FOSS components.

## Build and Distribution

- Build iOS in the cloud with Expo EAS.
- Do not distribute beta builds through the App Store when another supported distribution method is available.
- Build and distribute the Windows application separately from the iOS build.

## Chat UI

- Provide one chat screen.
- Display a message composer with a Send button.
- Display user prompts in right-aligned message bubbles.
- Display assistant responses as left-aligned, unboxed text in a centered conversation column, following [spec 007](../specs/archive/007-chat-reference-presentation/spec.md).
- Render assistant responses as Markdown.

## Beta 1 UI Exclusions

- No file uploads.
- No vectorization.
- No search UI. History is limited to the small recent-conversations list described under Conversation Storage.
- No model selection control.
- No left-side drawer menu.

## AI Provider

- Use OpenRouter for beta releases.
- Send chat-completions requests to `https://openrouter.ai/api/v1/chat/completions`.
- Use model `openrouter/auto`.
- Import the OpenRouter API key from a file through a file chooser and store it locally.

## Conversation Storage

- Store conversations as JSON files on the device.
- Use an app-owned, OpenAI-compatible schema for conversation JSON.
  - Each message includes `id`, `role`, string `content`, `createdAt`, and `status`.
  - Beta supports `system`, `user`, and `assistant` roles. Reserve `tool` for future tool calling.
  - Do not include provider-specific response fields in the canonical conversation format.
- Store one JSON file per conversation.
- Store a JSON manifest of conversations.
- Each manifest entry includes the conversation GUID, filename, title, model, and date.
- Do not use SQLite in beta releases.
- The initial history UI will show at most 5-10 conversations.
- Future search reads the manifest file and searches its contents.
- Persist conversations to S3 as JSON without data conversion.

## S3 Sync

- Configure an S3 bucket for each user.
- Import S3 credentials from a file through a file chooser and store them locally.
- Run a background sync job to upload local conversation and manifest changes.
- On application startup, download the latest conversation JSON files and manifest from S3.
- Use overwrite behavior for sync conflicts in beta releases.
- Empty, missing, and corrupt file handling is out of scope for beta releases.

## Future Design considerations

- Use extensible patterns for the provider, sync, storage, and secret-storage implementations. S3 is to begin with, but options for Google Drive etc. may be added later. Support sync providers other than S3 in a future release; some may require OAuth.
- Support AI providers other than OpenRouter in a future release; some may require OAuth.
- Add an application PIN or Face ID lock in a future release.
- Add optional age encryption for conversation JSON in a future release.
- Add optional age encryption for S3 credentials and AI provider keys in a future release.
