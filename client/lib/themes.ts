
export type Theme = {
  surface: string;        // page background
  surfaceRaised: string;  // cards, inputs
  textPrimary: string;    // headings, main text
  textMuted: string;      // labels, hints
  accent: string;         // links, primary buttons, focus
  borderSubtle: string;   // borders, dividers
  danger: string;         // errors
  success: string;        // positive / on-track
  warning: string;        // warnings
};

export const THEMES: Record<string, Theme> = {
  midnight: {
    surface: "#0F1535",
    surfaceRaised: "#1A1F45",
    textPrimary: "#FFFFFF",
    textMuted: "#A0AEC0",
    accent: "#2CD9FF",
    borderSubtle: "#2D3561",
    danger: "#E01E5A",
    success: "#2EB67D",
    warning: "#ECB22E",
  },
  mono: {
    surface: "#141414",
    surfaceRaised: "#1F1F1F",
    textPrimary: "#F5F5F5",
    textMuted: "#8A8A8A",
    accent: "#B8C4D0",    
    borderSubtle: "#333333",
    danger: "#D45B5B",      
    success: "#6BAF8D",
    warning: "#C9A961",
  },
  neon: {
    surface: "#0A0A12",      
    surfaceRaised: "#15121F",
    textPrimary: "#F0EBFF",
    textMuted: "#7A7295",
    accent: "#00E5FF",        
    borderSubtle: "#2A2440",
    danger: "#FF3B6B",
    success: "#3BFFB0",
    warning: "#FFD43B",
  },
  pink: {
    surface: "#1E1018",      
    surfaceRaised: "#2A1622",
    textPrimary: "#FBEEF4",
    textMuted: "#B08A9C",
    accent: "#FF8FB1",        
    borderSubtle: "#3D2230",
    danger: "#FF5C7A",
    success: "#5FCf9E",
    warning: "#F0B860",
  },
  daylight: {
    surface: "#F7F8FA",       
    surfaceRaised: "#FFFFFF",
    textPrimary: "#0F1535",   
    textMuted: "#64748B",
    accent: "#0891B2",        
    borderSubtle: "#E2E8F0",
    danger: "#DC2626",
    success: "#16A34A",
    warning: "#D97706",
  },
  forest: {
  surface: "#0D1A12",
  surfaceRaised: "#152417",
  textPrimary: "#EAF5EC",
  textMuted: "#7A9584",
  accent: "#3FCF8E",
  borderSubtle: "#24382A",
  danger: "#E5484D",
  success: "#46C48A",
  warning: "#E0A54B",
},
 amber: {
    surface: "#1A1410",
    surfaceRaised: "#241C15",
    textPrimary: "#FDF6EC",
    textMuted: "#B39B7D",
    accent: "#F5A623",
    borderSubtle: "#3A2E22",
    danger: "#E5533D",
    success: "#5FB37A",
    warning: "#E8C15A",
  },
  obsidian: {
    surface: "#000000",
    surfaceRaised: "#0D0D0D",
    textPrimary: "#FFFFFF",
    textMuted: "#8A8A8A",
    accent: "#4F8CFF",
    borderSubtle: "#1F1F1F",
    danger: "#FF4D4D",
    success: "#3DD68C",
    warning: "#FFC94D",
  },
  linen: {
    surface: "#F4F1EA",
    surfaceRaised: "#FDFBF6",
    textPrimary: "#2A2620",
    textMuted: "#6B6459",
    accent: "#A88B4A",
    borderSubtle: "#DDD6C7",
    danger: "#C0503C",
    success: "#5A9367",
    warning: "#C89A3F",
  },
};