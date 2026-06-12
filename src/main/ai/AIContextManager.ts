import * as fs from 'fs';

export interface AIContext {
    activeFilePath?: string;
    selectedText?: string;
    workspaceRoot?: string;
}

export class AIContextManager {
    // Rough estimation: 1 token ~= 4 chars
    private maxChars: number = 8000 * 4;

    public buildContextPrompt(context: AIContext): string {
        let prompt = "Context Information:\n";

        if (context.workspaceRoot) {
            prompt += `- Workspace Root: ${context.workspaceRoot}\n`;
        }

        if (context.activeFilePath) {
            prompt += `- Active File: ${context.activeFilePath}\n`;
            try {
                // Check file size to avoid OOM
                const stats = fs.statSync(context.activeFilePath);
                if (stats.size > this.maxChars) {
                    // Chunk the file if it's too large, just read the first part for now or a specific chunk
                    // For a robust implementation, we would implement a semantic chunking or sliding window.
                    const buffer = Buffer.alloc(this.maxChars);
                    const fd = fs.openSync(context.activeFilePath, 'r');
                    fs.readSync(fd, buffer, 0, this.maxChars, 0);
                    fs.closeSync(fd);
                    prompt += `- Active File Content (Truncated):\n\`\`\`\n${buffer.toString('utf8')}...\n\`\`\`\n`;
                } else {
                    const content = fs.readFileSync(context.activeFilePath, 'utf8');
                    prompt += `- Active File Content:\n\`\`\`\n${content}\n\`\`\`\n`;
                }
            } catch (err: any) {
                prompt += `- Active File Content: [Error reading file: ${err.message}]\n`;
            }
        }

        if (context.selectedText) {
            prompt += `- Selected Text:\n\`\`\`\n${context.selectedText}\n\`\`\`\n`;
        }

        prompt += "\nEnd of Context Information.\n";
        return prompt;
    }
}

export const aiContextManager = new AIContextManager();
