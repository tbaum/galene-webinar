# SupplyCanvas Galene Customizations

This directory contains custom styling and behavior for the Galene videoconference interface.

## Files

- **supplycanvas.css** - Custom CSS styles and branding
- **supplycanvas.js** - Custom JavaScript behavior (permission-based UI)
- **logo.svg** - SupplyCanvas logo (from www.supplycanvas.com)

## Customizations Applied

### 1. Branding
- **Page title:** "SupplyCanvas Webinar"
- **Header text:** "SupplyCanvas Webinar"
- **Sidebar header:** "SupplyCanvas"
- **Logo:** Official SupplyCanvas logo from website
- **Font:** Comfortaa (from Google Fonts, matching www.supplycanvas.com)
- **Brand colors:** Extracted from SupplyCanvas logo
  - Primary (Teal): `#2a9d8f`
  - Secondary (Coral): `#e76f51`
  - Accent (Yellow): `#e9c46a`
  - Dark text: `#264653`

### 2. Chat Disabled (All Users)
- Chat window hidden via CSS
- Chat input form hidden
- Chat buttons removed

### 3. Participant List Hidden (Viewers Only)
- Users with "observe" permission cannot see participant list
- Presenters and operators see full interface
- Detection via JavaScript checking user permissions

### 4. Permission Levels
- **observe** - Viewer (no participant list, no chat, video only)
- **present** - Presenter (full interface, can share video/audio)
- **op** - Operator (full interface, moderator controls)

## Logo Customization

The SupplyCanvas logo is automatically displayed in the header using CSS pseudo-element.

**Current logo:** Downloaded from `https://cdn.prod.website-files.com/64a9c438a0520f0d7f8c4178/689c9a428e20cc669e68a9af_logo-01.svg`

To update the logo:

1. Replace `logo.svg` with a new logo file
2. Adjust the width in `supplycanvas.css` if needed (currently 120px × 32px)

## Maintenance

### When Updating Galene

1. Pull new Galene Docker image
2. Test that custom files still work
3. Check browser console for any JavaScript errors
4. Verify CSS selectors still apply (check HTML structure)

### Likely Stable
- CSS selectors: `#users`, `#chat`, `#left-sidebar`
- JavaScript API: `serverConnection.permissions`

### May Need Updates
- If Galene changes permission system
- If Galene restructures HTML significantly
- If Galene adds new UI elements that need hiding

## Debugging

Open browser console and run:
```javascript
supplyCanvasDebug()
```

This shows:
- Server connection state
- User permissions
- Applied CSS classes
