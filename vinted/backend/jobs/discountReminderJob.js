import cron from 'node-cron';
import Item from '../models/Item.js';
import Notification from '../models/Notification.js';

/**
 * Discount Reminder Cron Job
 * Runs every day at 9:00 AM UTC
 * Finds items that have been ACTIVE + UNSOLD for 30+ days and haven't had a discount prompt yet.
 * Sends a platform notification to the seller.
 */
const startDiscountReminderJob = () => {
    cron.schedule('0 9 * * *', async () => {
        console.log('[DiscountReminderJob] Running...');
        try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Find items that are active, unsold, not deleted, listed > 30 days ago, and prompt not yet sent
            const stalledItems = await Item.find({
                status: 'active',
                is_sold: false,
                is_deleted: false,
                discount_prompt_sent: false,
                created_at: { $lte: thirtyDaysAgo }
            }).populate('seller_id', '_id username email');

            console.log(`[DiscountReminderJob] Found ${stalledItems.length} items due for discount reminder.`);

            for (const item of stalledItems) {
                const seller = item.seller_id;
                if (!seller || !seller._id) continue;

                // Send a platform notification to the seller
                await Notification.create({
                    user_id: seller._id,
                    title: '🏷️ Your listing hasn\'t sold yet — consider a discount!',
                    message: `Your item "${item.title}" has been listed for over 30 days (${item.views_count} views, ${item.likes_count} likes). Sellers who discount by 10–30% sell up to 3x faster! Open the item to apply a discount.`,
                    type: 'info',
                    link: `/items/${item._id}`
                });

                // Mark the item so we don't send this prompt again
                await Item.findByIdAndUpdate(item._id, { discount_prompt_sent: true });

                console.log(`[DiscountReminderJob] Sent discount reminder to seller "${seller.username}" for item "${item.title}"`);
            }

            console.log('[DiscountReminderJob] Done.');
        } catch (err) {
            console.error('[DiscountReminderJob] Error:', err.message);
        }
    }, {
        timezone: 'UTC'
    });

    console.log('✅ Discount Reminder Job scheduled (daily 9AM UTC)');
};

export default startDiscountReminderJob;
