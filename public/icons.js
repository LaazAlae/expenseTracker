// Professional SVG Icon System - Enterprise Grade
const IconSystem = {
  // Create SVG icons with consistent styling
  create: (iconName, size = 20, className = '') => {
    const icons = {
      add: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14"/>
      </svg>`,
      
      close: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m18 6-12 12M6 6l12 12"/>
      </svg>`,
      
      check: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4"/>
      </svg>`,
      
      edit: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>`,
      
      delete: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="10" x2="10" y1="11" y2="17"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="14" x2="14" y1="11" y2="17"/>
      </svg>`,
      
      menu: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <line stroke="currentColor" stroke-width="2.5" stroke-linecap="round" x1="4" x2="20" y1="6" y2="6"/>
        <line stroke="currentColor" stroke-width="2.5" stroke-linecap="round" x1="4" x2="20" y1="12" y2="12"/>
        <line stroke="currentColor" stroke-width="2.5" stroke-linecap="round" x1="4" x2="20" y1="18" y2="18"/>
      </svg>`,
      
      export: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="7,10 12,15 17,10"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="12" x2="12" y1="15" y2="3"/>
      </svg>`,
      
      settings: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="12" r="3"/>
      </svg>`,
      
      logout: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="16,17 21,12 16,7"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="21" x2="9" y1="12" y2="12"/>
      </svg>`,
      
      money: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="12" x2="12" y1="2" y2="22"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>`,
      
      user: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="7" r="4"/>
      </svg>`,
      
      document: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="14,2 14,8 20,8"/>
      </svg>`,
      
      warning: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 9v4"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m12 17 .01 0"/>
      </svg>`,
      
      error: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="12" r="10"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="m15 9-6 6m0-6 6 6"/>
      </svg>`,
      
      success: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="12" r="10"/>
        <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4"/>
      </svg>`,
      
      info: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="12" r="10"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 16v-4"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m12 8 .01 0"/>
      </svg>`,
      
      flight: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3s-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>
      </svg>`,
      
      bd: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <rect stroke="currentColor" stroke-width="2" width="18" height="18" x="3" y="3" rx="2" ry="2"/>
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 12h10M12 7v10"/>
      </svg>`,
      
      cancel: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m18 6-12 12M6 6l12 12"/>
      </svg>`,

      chevronDown: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m6 9 6 6 6-6"/>
      </svg>`,

      chevronUp: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m18 15-6-6-6 6"/>
      </svg>`,

      eye: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className}">
        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
        <circle stroke="currentColor" stroke-width="2" cx="12" cy="12" r="3"/>
      </svg>`,

      loader: `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" class="icon ${className} spin">
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="12" x2="12" y1="2" y2="6"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="12" x2="12" y1="18" y2="22"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="4.93" x2="7.76" y1="4.93" y2="7.76"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="16.24" x2="19.07" y1="16.24" y2="19.07"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="2" x2="6" y1="12" y2="12"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="18" x2="22" y1="12" y2="12"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="4.93" x2="7.76" y1="19.07" y2="16.24"/>
        <line stroke="currentColor" stroke-width="2" stroke-linecap="round" x1="16.24" x2="19.07" y1="7.76" y2="4.93"/>
      </svg>`
    };
    
    return icons[iconName] || icons.info;
  }
};

// Simplified icon function for inline usage
function icon(name, size = 20, className = '') {
  return IconSystem.create(name, size, className);
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.IconSystem = IconSystem;
  window.icon = icon;
}