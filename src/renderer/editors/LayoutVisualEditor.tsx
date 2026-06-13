import React, { useState } from 'react';
import { Layers, MousePointer2, Layout, Settings2 } from 'lucide-react';

interface LayoutVisualEditorProps {
    content: string;
    onChange: (content: string) => void;
    viewMode: 'code' | 'split' | 'visual';
}

export const LayoutVisualEditor: React.FC<LayoutVisualEditorProps> = ({ content, onChange, viewMode }) => {
    const [selectedNodePath, setSelectedNodePath] = useState<string | null>(null);

    // Basic XML Parser
    const renderNode = (node: ChildNode, path: string): React.ReactNode => {
        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        const el = node as Element;
        const tagName = el.tagName;
        
        // Extract attributes
        const attrs: Record<string, string> = {};
        for (let i = 0; i < el.attributes.length; i++) {
            const attr = el.attributes[i];
            attrs[attr.name] = attr.value;
        }

        // Basic styling based on android attributes
        const style: React.CSSProperties = {
            display: 'flex',
            position: 'relative',
            boxSizing: 'border-box',
            flexDirection: 'column', // default for LinearLayout vertical
            border: selectedNodePath === path ? '2px solid #3b82f6' : '1px dashed transparent',
            minHeight: '20px',
        };

        if (attrs['android:layout_width'] === 'match_parent') style.width = '100%';
        else if (attrs['android:layout_width'] === 'wrap_content') style.width = 'auto';
        else if (attrs['android:layout_width']) style.width = attrs['android:layout_width'].replace('dp', 'px');

        if (attrs['android:layout_height'] === 'match_parent') style.flex = '1';
        else if (attrs['android:layout_height'] === 'wrap_content') style.height = 'auto';
        else if (attrs['android:layout_height']) style.height = attrs['android:layout_height'].replace('dp', 'px');

        if (attrs['android:orientation'] === 'horizontal') style.flexDirection = 'row';
        if (attrs['android:background']) style.backgroundColor = attrs['android:background'].replace('@color/', '#'); // Simplified color resolution
        if (attrs['android:padding']) style.padding = attrs['android:padding'].replace('dp', 'px');
        if (attrs['android:layout_margin']) style.margin = attrs['android:layout_margin'].replace('dp', 'px');

        const children = Array.from(el.childNodes).map((child, idx) => renderNode(child, `${path}.${idx}`));

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedNodePath(path);
        };

        const handleDropOnNode = (e: React.DragEvent) => {
            e.stopPropagation();
            e.preventDefault();
            const componentType = e.dataTransfer.getData('component_type');
            if (componentType) {
                addComponent(componentType, el);
            }
        };

        const handleDragOverOnNode = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
        };

        if (tagName === 'LinearLayout' || tagName === 'RelativeLayout' || tagName === 'FrameLayout' || tagName === 'ScrollView' || tagName === 'androidx.constraintlayout.widget.ConstraintLayout') {
            return (
                <div 
                    key={path} 
                    style={style} 
                    onClick={handleClick} 
                    onDrop={handleDropOnNode}
                    onDragOver={handleDragOverOnNode}
                    className="min-h-[20px] min-w-[20px] hover:border-blue-300 border-dashed border"
                >
                    {children}
                </div>
            );
        }

        if (tagName === 'TextView') {
            return (
                <div key={path} style={{...style, color: attrs['android:textColor'] || '#000', fontSize: attrs['android:textSize']?.replace('sp', 'px') || '14px'}} onClick={handleClick} className="hover:border-blue-300 border-dashed border p-1">
                    {attrs['android:text'] || 'TextView'}
                </div>
            );
        }

        if (tagName === 'Button') {
            return (
                <button key={path} style={{...style, backgroundColor: '#6200EE', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', justifyContent: 'center', alignItems: 'center'}} onClick={handleClick}>
                    {attrs['android:text'] || 'Button'}
                </button>
            );
        }

        if (tagName === 'ImageView') {
            return (
                <div key={path} style={{...style, minHeight: '48px', minWidth: '48px', backgroundColor: '#e0e0e0', alignItems: 'center', justifyContent: 'center'}} onClick={handleClick} className="hover:border-blue-300 border-dashed border">
                    <MousePointer2 size={24} className="text-gray-400" />
                </div>
            );
        }

        // Generic fallback for unknown views
        return (
            <div key={path} style={{...style, backgroundColor: '#f0f0f0', padding: '4px', fontSize: '10px'}} onClick={handleClick} className="hover:border-blue-300 border-dashed border">
                &lt;{tagName}&gt;
            </div>
        );
    };

    let renderedTree: React.ReactNode = null;
    let xmlDoc: Document | null = null;
    
    try {
        const parser = new DOMParser();
        xmlDoc = parser.parseFromString(content, "text/xml");
        const parseError = xmlDoc.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
            throw new Error("XML Parsing Error");
        }
        if (xmlDoc.documentElement) {
            renderedTree = renderNode(xmlDoc.documentElement, 'root');
        }
    } catch (e: any) {
        renderedTree = <div className="text-red-500 text-sm">Failed to parse layout XML</div>;
    }

    // Properties panel helper
    const getSelectedAttributes = () => {
        if (!selectedNodePath || !xmlDoc) return null;
        
        // Find the node based on path (root.0.1.0 etc)
        const parts = selectedNodePath.split('.');
        let current: Node | null = xmlDoc.documentElement;
        
        for (let i = 1; i < parts.length; i++) {
            if (!current) break;
            const index = parseInt(parts[i]);
            if (!isNaN(index) && current.childNodes.length > index) {
                current = current.childNodes[index];
            } else {
                current = null;
            }
        }

        if (current && current.nodeType === Node.ELEMENT_NODE) {
            const el = current as Element;
            const attrs: {name: string, value: string}[] = [];
            for (let i = 0; i < el.attributes.length; i++) {
                attrs.push({name: el.attributes[i].name, value: el.attributes[i].value});
            }
            return {
                tagName: el.tagName,
                attributes: attrs,
                element: el
            };
        }
        return null;
    };

    const selectedElementData = getSelectedAttributes();

    const addComponent = (type: string, parentNode: Element | null) => {
        if (!xmlDoc) return;
        const newEl = xmlDoc.createElement(type);
        newEl.setAttribute('android:layout_width', 'wrap_content');
        newEl.setAttribute('android:layout_height', 'wrap_content');
        
        if (type === 'TextView' || type === 'Button') {
            newEl.setAttribute('android:text', type);
        }
        
        if (parentNode) {
            parentNode.appendChild(newEl);
        } else if (xmlDoc.documentElement) {
            xmlDoc.documentElement.appendChild(newEl);
        }
        
        const serializer = new XMLSerializer();
        const newXmlStr = serializer.serializeToString(xmlDoc as Node);
        onChange(newXmlStr);
    };

    const handleAttributeChange = (name: string, value: string) => {
        if (!selectedElementData?.element) return;
        selectedElementData.element.setAttribute(name, value);
        // Serialize back to XML
        const serializer = new XMLSerializer();
        const newXmlStr = serializer.serializeToString(xmlDoc as Node);
        // We might want to format the XML, but simple sync works
        onChange(newXmlStr);
    };

    return (
        <div className={`h-full w-full flex ${viewMode === 'split' ? 'flex-row' : ''}`}>
            {/* If in split mode, we might want Monaco here, but Monaco is managed by EditorArea.
                Actually, EditorArea should render CodeEditor AND LayoutVisualEditor side-by-side if viewMode is 'split'.
                So this component just needs to render the Design Surface, Palette, and Properties.
            */}
            
            {/* Left: Component Palette */}
            <div className="w-64 bg-[#252526] border-r border-[#3e3e42] flex flex-col shrink-0">
                <div className="px-4 py-2 border-b border-[#3e3e42] text-xs font-semibold text-gray-300 flex items-center gap-2">
                    <Layers size={14} /> Palette
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="mb-4">
                        <div className="text-[11px] uppercase text-gray-500 mb-2 font-bold px-2">Containers</div>
                        <div className="flex flex-col gap-1">
                            <PaletteItem name="LinearLayout" icon={<Layout size={14} />} />
                            <PaletteItem name="RelativeLayout" icon={<Layout size={14} />} />
                            <PaletteItem name="FrameLayout" icon={<Layout size={14} />} />
                            <PaletteItem name="ScrollView" icon={<Layout size={14} />} />
                        </div>
                    </div>
                    <div className="mb-4">
                        <div className="text-[11px] uppercase text-gray-500 mb-2 font-bold px-2">Widgets</div>
                        <div className="flex flex-col gap-1">
                            <PaletteItem name="TextView" icon={<MousePointer2 size={14} />} />
                            <PaletteItem name="Button" icon={<MousePointer2 size={14} />} />
                            <PaletteItem name="ImageView" icon={<MousePointer2 size={14} />} />
                            <PaletteItem name="EditText" icon={<MousePointer2 size={14} />} />
                            <PaletteItem name="CheckBox" icon={<MousePointer2 size={14} />} />
                            <PaletteItem name="Switch" icon={<MousePointer2 size={14} />} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Center: Design Surface */}
            <div className="flex-1 bg-[#1e1e1e] overflow-auto flex items-center justify-center relative p-8">
                {/* Background Grid Pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                
                {/* Device Frame */}
                <div className="w-[360px] h-[640px] bg-white text-black shadow-2xl relative overflow-hidden flex flex-col shrink-0">
                    {/* Simulated Status Bar */}
                    <div className="h-6 bg-gray-200 flex items-center justify-end px-2 text-[10px] text-gray-600">
                        12:00
                    </div>
                    {/* Rendered Layout Area */}
                    <div className="flex-1 relative border-4 border-gray-100 bg-white" onClick={() => setSelectedNodePath(null)}>
                        {renderedTree}
                    </div>
                </div>
            </div>

            {/* Right: Properties Inspector */}
            <div className="w-64 bg-[#252526] border-l border-[#3e3e42] flex flex-col shrink-0">
                <div className="px-4 py-2 border-b border-[#3e3e42] text-xs font-semibold text-gray-300 flex items-center gap-2">
                    <Settings2 size={14} /> Attributes
                </div>
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    {selectedElementData ? (
                        <>
                            <div className="font-bold text-gray-200 border-b border-[#3e3e42] pb-2 mb-2">
                                &lt;{selectedElementData.tagName}&gt;
                            </div>
                            {selectedElementData.attributes.map(attr => (
                                <div key={attr.name} className="flex flex-col gap-1">
                                    <label className="text-[10px] text-gray-500 font-medium">{attr.name.replace('android:', '')}</label>
                                    <input 
                                        type="text" 
                                        className="bg-[#1e1e1e] border border-[#3e3e42] text-xs text-gray-300 px-2 py-1 rounded w-full focus:outline-none focus:border-ide-accent"
                                        value={attr.value}
                                        onChange={(e) => handleAttributeChange(attr.name, e.target.value)}
                                    />
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="text-xs text-gray-500 text-center mt-8">
                            Select a component in the design surface to view its properties.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const PaletteItem = ({ name, icon }: { name: string, icon: React.ReactNode }) => (
    <div 
        draggable 
        onDragStart={(e) => {
            e.dataTransfer.setData('component_type', name);
            e.dataTransfer.effectAllowed = 'copy';
        }}
        className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:bg-[#37373d] hover:text-white rounded cursor-grab active:cursor-grabbing"
    >
        {icon}
        {name}
    </div>
);
