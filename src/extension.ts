import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('AI Code Improvement extension is now active!');

  const disposable = vscode.commands.registerCommand('gameai.improveCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('No editor is active');
      return;
    }

    const selection = editor.selection;
    const selectedCode = editor.document.getText(selection);

    if (!selectedCode) {
      vscode.window.showWarningMessage('Please select some code to improve.');
      return;
    }

    const userPrompt = await vscode.window.showInputBox({
      prompt: 'What do you want to improve or change in this code?',
      placeHolder: 'e.g., Optimize performance, add comments, refactor to async...',
    });

    if (!userPrompt) {
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating improved code...',
        cancellable: false,
      },
      async () => {
        try {
          const response = await fetch('http://localhost:8000/ai-improve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: selectedCode, prompt: userPrompt }),
          });

          const { modifiedCode, explanation } = await response.json();

          const panel = vscode.window.createWebviewPanel(
            'aiImprovedCode',
            'AI Improved Code',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
          );

          panel.webview.html = getWebviewContent(modifiedCode, explanation, editor.document.languageId);

          panel.webview.onDidReceiveMessage(
            async (message) => {
              if (message.command === 'applyChanges') {
                await editor.edit((editBuilder) => {
                  editBuilder.replace(selection, modifiedCode);
                });
                vscode.window.showInformationMessage('Code updated with improvements.');
                panel.dispose();
              }
            },
            undefined,
            context.subscriptions
          );
        } catch (err) {
          vscode.window.showErrorMessage('Failed to connect to AI backend.');
          console.error(err);
        }
      }
    );
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(code: string, explanation: string, language: string): string {
  const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const escapedExplanation = explanation
    ? explanation.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
    : 'No explanation provided.';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>AI Improved Code</title>
      <style>
        body {
          font-family: sans-serif;
          padding: 10px;
        }
        pre {
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 12px;
          overflow-x: auto;
          border-radius: 5px;
        }
        button {
          background: #007acc;
          color: white;
          border: none;
          padding: 8px 16px;
          margin-top: 16px;
          cursor: pointer;
          border-radius: 4px;
        }
        button:hover {
          background: #005a9e;
        }
        .explanation {
          margin-top: 20px;
          background: #f3f3f3;
          padding: 10px;
          border-radius: 5px;
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
      <script>hljs.highlightAll();</script>
    </head>
    <body>
      <h2>AI-Improved Code</h2>
      <pre><code class="${language}">${escapedCode}</code></pre>
      <button onclick="applyChanges()">Apply Changes</button>
      <div class="explanation">
        <h3>Explanation</h3>
        <p>${escapedExplanation}</p>
      </div>
      <script>
        const vscode = acquireVsCodeApi();
        function applyChanges() {
          vscode.postMessage({ command: 'applyChanges' });
        }
      </script>
    </body>
    </html>
  `;
}
