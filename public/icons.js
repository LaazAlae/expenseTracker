// Lucide icons as React components
const lucide = {
  Plus: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M12 5v14M5 12h14' } }
    ]
  }),
  
  Download: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
      { type: 'polyline', props: { points: '7,10 12,15 17,10' } },
      { type: 'line', props: { x1: 12, y1: 15, x2: 12, y2: 3 } }
    ]
  }),
  
  User: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } },
      { type: 'circle', props: { cx: 12, cy: 7, r: 4 } }
    ]
  }),
  
  FileText: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M14,2 L20,8 L20,20 A2,2 0 0,1 18,22 L6,22 A2,2 0 0,1 4,20 L4,4 A2,2 0 0,1 6,2 Z' } },
      { type: 'polyline', props: { points: '14,2 14,8 20,8' } },
      { type: 'line', props: { x1: 16, y1: 13, x2: 8, y2: 13 } },
      { type: 'line', props: { x1: 16, y1: 17, x2: 8, y2: 17 } },
      { type: 'polyline', props: { points: '10,9 9,9 8,9' } }
    ]
  }),
  
  LogOut: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' } },
      { type: 'polyline', props: { points: '16,17 21,12 16,7' } },
      { type: 'line', props: { x1: 21, y1: 12, x2: 9, y2: 12 } }
    ]
  }),
  
  Wifi: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'path', props: { d: 'M5 12.55a11 11 0 0 1 14.08 0' } },
      { type: 'path', props: { d: 'M1.42 9a16 16 0 0 1 21.16 0' } },
      { type: 'path', props: { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' } },
      { type: 'line', props: { x1: 12, y1: 20, x2: 12.01, y2: 20 } }
    ]
  }),
  
  WifiOff: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'line', props: { x1: 1, y1: 1, x2: 23, y2: 23 } },
      { type: 'path', props: { d: 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55' } },
      { type: 'path', props: { d: 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39' } },
      { type: 'path', props: { d: 'M10.71 5.05A16 16 0 0 1 22.58 9' } },
      { type: 'path', props: { d: 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88' } },
      { type: 'path', props: { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' } },
      { type: 'line', props: { x1: 12, y1: 20, x2: 12.01, y2: 20 } }
    ]
  }),
  
  Loader: () => ({ 
    type: 'svg', 
    props: { 
      width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', 
      stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
    }, 
    children: [
      { type: 'line', props: { x1: 12, y1: 2, x2: 12, y2: 6 } },
      { type: 'line', props: { x1: 12, y1: 18, x2: 12, y2: 22 } },
      { type: 'line', props: { x1: 4.93, y1: 4.93, x2: 7.76, y2: 7.76 } },
      { type: 'line', props: { x1: 16.24, y1: 16.24, x2: 19.07, y2: 19.07 } },
      { type: 'line', props: { x1: 2, y1: 12, x2: 6, y2: 12 } },
      { type: 'line', props: { x1: 18, y1: 12, x2: 22, y2: 12 } },
      { type: 'line', props: { x1: 4.93, y1: 19.07, x2: 7.76, y2: 16.24 } },
      { type: 'line', props: { x1: 16.24, y1: 7.76, x2: 19.07, y2: 4.93 } }
    ]
  })
};

// Helper to create React elements from icon definitions
const createIcon = (iconDef, props = {}) => {
  const icon = iconDef();
  const mergedProps = { ...icon.props, ...props };
  const children = icon.children ? icon.children.map((child, index) => 
    React.createElement(child.type, { key: index, ...child.props })
  ) : [];
  return React.createElement(icon.type, mergedProps, ...children);
};

// Export icon components
const Plus = (props) => createIcon(lucide.Plus, props);
const Download = (props) => createIcon(lucide.Download, props);
const User = (props) => createIcon(lucide.User, props);
const FileText = (props) => createIcon(lucide.FileText, props);
const LogOut = (props) => createIcon(lucide.LogOut, props);
const Wifi = (props) => createIcon(lucide.Wifi, props);
const WifiOff = (props) => createIcon(lucide.WifiOff, props);
const Loader = (props) => createIcon(lucide.Loader, props);