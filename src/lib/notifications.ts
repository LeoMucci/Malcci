import { supabase } from './supabase';

export async function sendNotification(
  fromUserId: number,
  type: 'new_memory' | 'new_comment' | 'new_message' | 'birthday' | 'anniversary' | 'special_date' | 'suggestion',
  title: string,
  description: string = '',
  relatedId?: number
) {
  try {
    // If the sender is user 1 (Luysa / 'ela'), the recipient is user 2 (Leonardo / 'eu').
    // If the sender is user 2 (Leonardo / 'eu'), the recipient is user 1 (Luysa / 'ela').
    const recipientId = fromUserId === 1 ? 2 : 1;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        type,
        title,
        description,
        related_id: relatedId || null,
        read: false,
      });

    if (error) {
      console.warn('Failed to insert notification in database:', error.message);
    }
  } catch (err) {
    console.error('Failed to trigger sendNotification:', err);
  }
}
