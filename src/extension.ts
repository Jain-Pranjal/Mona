import * as vscode from 'vscode';
import fetch from 'node-fetch';

export function activate(context: vscode.ExtensionContext) {
  vscode.window.showInformationMessage('Mona extension is now active!');

  const disposable = vscode.commands.registerCommand('mona.improve', async () => {
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
            'monaImprovedCode',
            'Mona Improved Code',
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
          font-family: 'Fira Code', 'JetBrains Mono', monospace;
          padding: 20px;
          background-color: #f9f9f9;
          color: #333;
        }
        h2 {
          text-align: center;
          margin-bottom: 20px;
        }
        .tabs {
          display: flex;
          margin-bottom: 20px;
          cursor: pointer;
        }
        .tab {
          flex: 1;
          text-align: center;
          padding: 10px;
          background: #e0e0e0;
          border-radius: 5px 5px 0 0;
          margin-right: 2px;
          font-weight: bold;
        }
        .tab.active {
          background: #ffffff;
          border-bottom: 2px solid #007acc;
        }
        .tab-content {
          display: none;
          background: #fff;
          border-radius: 0 0 5px 5px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .tab-content.active {
          display: block;
        }
        pre {
          background-color: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          overflow-x: auto;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        button {
          display: block;
          margin: 30px auto 0;
          background: #007acc;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          cursor: pointer;
          border-radius: 6px;
          transition: background 0.3s;
        }
        button:hover {
          background: #005a9e;
        }
        .explanation {
          line-height: 1.6;
        }
      </style>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/github-dark.min.css">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
      <script>hljs.highlightAll();</script>
    </head>
    <body>
      <h2>🚀 Mona Improved Code</h2>

      <div class="tabs">
        <div class="tab active" onclick="showTab('codeTab')">Improved Code</div>
        <div class="tab" onclick="showTab('explanationTab')">Explanation</div>
      </div>

      <div id="codeTab" class="tab-content active">
        <pre><code class="${language}">${escapedCode}</code></pre>
        <button onclick="applyChanges()">✅ Apply Changes</button>
      </div>

      <div id="explanationTab" class="tab-content">
        <div class="explanation">
          <p>${escapedExplanation}</p>
        </div>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        function applyChanges() {
          vscode.postMessage({ command: 'applyChanges' });
        }

        function showTab(tabId) {
          document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
          document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
          document.getElementById(tabId).classList.add('active');
          event.target.classList.add('active');
        }
      </script>
    </body>
    </html>
  `;
}
