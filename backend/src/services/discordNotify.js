import axios from 'axios';

export const sendDiscordNotification = async (ticket, type = 'created', extraText = '') => {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    let content = '';
    let color = 3447003; // Blue
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

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
