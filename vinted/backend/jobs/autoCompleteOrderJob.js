import cron from 'node-cron';
import Order from '../models/Order.js';

const startAutoCompleteOrderJob = () => {
    // Run every day at midnight (0 0 * * *)
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running auto-complete order job...');
            
            // 5 days ago
            const fiveDaysAgo = new Date();
            fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
            
            // Find orders that are 'delivered' and delivered_at is > 5 days ago
            const ordersToComplete = await Order.find({
                order_status: 'delivered',
                delivered_at: { $lte: fiveDaysAgo }
            });
            
            if (ordersToComplete.length > 0) {
                console.log(`Found ${ordersToComplete.length} orders to auto-complete.`);
                for (const order of ordersToComplete) {
                    order.order_status = 'completed';
                    await order.save();
                    console.log(`Order ${order.order_number} auto-marked as completed.`);
                }
            }
        } catch (error) {
            console.error('Error in auto-complete order job:', error);
        }
    });
};

export default startAutoCompleteOrderJob;
