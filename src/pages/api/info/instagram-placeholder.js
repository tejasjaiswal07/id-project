export default function handler(req, res) {
  // Generate a simple placeholder SVG for Instagram content
  const svg = `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="#E1306C"/>
    <text x="50%" y="50%" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">Instagram Content</text>
    <path d="M200,100 C236,100 260,124 260,160 C260,196 236,220 200,220 C164,220 140,196 140,160 C140,124 164,100 200,100 Z M230,230 L260,260 M160,160 C160,180 180,200 200,200 C220,200 240,180 240,160 C240,140 220,120 200,120 C180,120 160,140 160,160 Z" fill="none" stroke="white" stroke-width="10"/>
  </svg>`;
  
  // Set SVG headers
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  
  // Send the SVG
  res.status(200).send(svg);
}
