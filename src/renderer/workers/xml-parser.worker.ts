self.onmessage = (e: MessageEvent) => {
    const { xmlStr, path } = e.data;
    
    try {
        // In a Web Worker, DOMParser is NOT available natively!
        // Wait, DOMParser is not available in Web Workers in the browser.
        // But we are in an electron renderer environment. Actually, DOMParser is NOT available in a standard Web Worker context.
        // We might need to use a lightweight XML parser library, e.g., fast-xml-parser or sax, or manually match basic tags.
        // For now, since we only need to catch gross syntax errors, let's just do a regex pass or fallback to not blocking.
        // Wait! We can use a lightweight regex validation or since it's a worker, we could use an imported pure JS parser if one was installed.
        // Let's implement a very basic regex check to find unmatched tags for now, as DOMParser won't work in a Worker.
        
        let errors = [];
        
        // Very rudimentary validation (e.g., checking tag balance)
        const tags = xmlStr.match(/<\/?([a-zA-Z0-9_:-]+)[^>]*>/g) || [];
        const stack: string[] = [];
        
        for (const tag of tags) {
            // Ignore self-closing tags, xml declarations, and comments
            if (tag.endsWith('/>') || tag.startsWith('<?') || tag.startsWith('<!--') || tag.startsWith('<!')) {
                continue;
            }
            
            const isClosing = tag.startsWith('</');
            const tagNameMatch = tag.match(/<\/?([a-zA-Z0-9_:-]+)/);
            if (!tagNameMatch) continue;
            
            const tagName = tagNameMatch[1];
            
            if (!isClosing) {
                stack.push(tagName);
            } else {
                if (stack.length === 0) {
                    errors.push({ line: 1, col: 1, message: `Unexpected closing tag: </${tagName}>` });
                } else {
                    const top = stack.pop();
                    if (top !== tagName) {
                        errors.push({ line: 1, col: 1, message: `Mismatched tag: expected </${top}> but found </${tagName}>` });
                    }
                }
            }
        }
        
        if (stack.length > 0) {
            errors.push({ line: 1, col: 1, message: `Unclosed tag: <${stack[stack.length - 1]}>` });
        }
        
        self.postMessage({ success: true, path, errors });
    } catch (err: any) {
        self.postMessage({ success: false, path, error: err.message });
    }
};
