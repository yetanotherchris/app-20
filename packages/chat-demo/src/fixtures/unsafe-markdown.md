# Unsafe markdown

<div onclick="alert('xss')">raw html div</div>

<script>alert('xss')</script>

<img src="https://example.com/remote.png" alt="remote image" />

![remote image](https://example.com/remote.png)

<a href="javascript:alert(1)">javascript link</a>

[javascript link](javascript:alert(1))

<iframe src="https://example.com"></iframe>

`<div>` inside a code block is literal text