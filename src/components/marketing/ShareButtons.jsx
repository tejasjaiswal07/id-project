import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { 
  Facebook, 
  Twitter, 
  WhatsApp, 
  LinkedIn, 
  ContentCopy 
} from '@mui/icons-material';

export default function ShareButtons({ url, title, description }) {
  const encodedUrl = encodeURIComponent(url || window.location.href);
  const encodedTitle = encodeURIComponent(title || document.title);
  const encodedDescription = encodeURIComponent(description || '');

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`
  };

  const handleShare = (platform) => {
    window.open(shareLinks[platform], '_blank', 'width=600,height=400');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url || window.location.href);
    alert('Link copied to clipboard!');
  };

  return (
    <Box sx={{ textAlign: 'center', my: 3 }}>
      <Typography variant="subtitle2" gutterBottom>
        Share this with your friends:
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
        <Tooltip title="Share on Facebook">
          <IconButton 
            color="primary" 
            onClick={() => handleShare('facebook')}
            aria-label="Share on Facebook"
          >
            <Facebook />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Share on Twitter">
          <IconButton 
            color="primary" 
            onClick={() => handleShare('twitter')}
            aria-label="Share on Twitter"
          >
            <Twitter />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Share on WhatsApp">
          <IconButton 
            color="primary" 
            onClick={() => handleShare('whatsapp')}
            aria-label="Share on WhatsApp"
          >
            <WhatsApp />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Share on LinkedIn">
          <IconButton 
            color="primary" 
            onClick={() => handleShare('linkedin')}
            aria-label="Share on LinkedIn"
          >
            <LinkedIn />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Copy Link">
          <IconButton 
            color="primary" 
            onClick={copyToClipboard}
            aria-label="Copy Link"
          >
            <ContentCopy />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
