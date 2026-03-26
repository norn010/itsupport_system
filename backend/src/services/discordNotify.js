import axios from 'axios';

export const sendDiscordNotification = async (ticket, type = 'created', extraText = '', imageUrl = null) => {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let content = '';
    let color = 3447003; // Blue
    const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    // Remove trailing slash for consistent joining
    const clientUrl = rawClientUrl.endsWith('/') ? rawClientUrl.slice(0, -1) : rawClientUrl;

    // Use CLIENT_URL but point to backend port ONLY IF it's localhost
    let baseUrl = clientUrl;
    if (clientUrl.includes('localhost') || clientUrl.includes('127.0.0.1')) {
      baseUrl = clientUrl.replace(':5173', ':5000'); 
    }

    if (type === 'created') {
      content = '🚨 **New Support Ticket Required Attention** 🚨';
      color = 15158332; // Red
    } else if (type === 'message') {
      content = '💬 **New Message on Ticket** 💬';
      color = 3066993; // Green
    } else {
      content = 'ℹ️ **Ticket Update Notification**';
    }

    const embed = {
      title: `[${ticket.ticket_id}] ${ticket.issue_title || ticket.title || 'Support Ticket'}`,
      description: extraText || ticket.description || 'No description provided.',
      url: `${clientUrl}/admin/ticket/${ticket.ticket_id}`,
      color: color,
      fields: [
        {
          name: 'Reported By',
          value: ticket.name || 'Unknown',
          inline: true
        },
        {
          name: 'Priority',
          value: ticket.priority || 'Medium',
          inline: true
        },
        {
          name: 'Status',
          value: ticket.status || 'Open',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Enterprise IT Support System'
      }
    };

    if (imageUrl) {
      // Ensure the URL is absolute and correctly formatted
      const cleanImageUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
      const absoluteImageUrl = imageUrl.startsWith('http') ? imageUrl : `${baseUrl}${cleanImageUrl}`;
      embed.image = { url: absoluteImageUrl };
      console.log('Sending Discord notification with image URL:', absoluteImageUrl);
    }

    const payload = {
      content,
      embeds: [embed]
    };

    await axios.post(webhookUrl, payload);
    console.log('Discord notification sent successfully');
  } catch (error) {
    console.error('Error sending Discord notification:', error.message);
  }
};
