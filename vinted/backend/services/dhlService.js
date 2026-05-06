import axios from 'axios';
import Setting from '../models/Setting.js';

/**
 * DHL Express Integration Service
 */
class DHLService {
    constructor() {
        this.baseUrl = 'https://express.api.dhl.com/external/v1'; // Production URL
        // Sandbox: https://express.api.dhl.com/gsc/v1
    }

    async getSettings() {
        const settings = await Setting.findOne();
        if (!settings || !settings.dhl_api_key || !settings.dhl_api_secret) {
            throw new Error('DHL API credentials are not configured in Admin Settings.');
        }
        return settings;
    }

    async createShipment(order, item, buyer, seller) {
        const settings = await this.getSettings();
        
        const auth = Buffer.from(`${settings.dhl_api_key}:${settings.dhl_api_secret}`).toString('base64');

        const shipmentData = {
            plannedShippingDateAndTime: new Date().toISOString(),
            pickup: {
                isRequested: false, // For now, just label generation
            },
            productCode: 'P', // 'P' for Express Worldwide
            accounts: [
                {
                    number: settings.dhl_account_number,
                    typeCode: 'shipper'
                }
            ],
            customerDetails: {
                shipperDetails: {
                    postalAddress: {
                        postalCode: seller.address?.pincode || '400001',
                        cityName: seller.address?.city || 'Mumbai',
                        countryCode: 'IN', // Needs ISO code, we store 'India' - mapping might be needed
                        addressLine1: seller.address?.address_line || 'No address'
                    },
                    contactInformation: {
                        email: seller.email,
                        phone: seller.phone || '0000000000',
                        companyName: seller.username || 'Vinted Seller',
                        fullName: `${seller.first_name} ${seller.last_name}`.trim() || seller.username
                    }
                },
                receiverDetails: {
                    postalAddress: {
                        postalCode: order.shipping_address?.pincode || '400001',
                        cityName: order.shipping_address?.city || 'Mumbai',
                        countryCode: 'IN',
                        addressLine1: order.shipping_address?.address_line || 'No address'
                    },
                    contactInformation: {
                        email: buyer.email,
                        phone: order.shipping_address?.phone || '0000000000',
                        companyName: 'Individual Buyer',
                        fullName: order.shipping_address?.full_name || buyer.username
                    }
                }
            },
            content: {
                packages: [
                    {
                        weight: 0.5, // Default weight
                        dimensions: {
                            length: 10,
                            width: 10,
                            height: 10
                        },
                        description: item.title
                    }
                ],
                isCustomsDeclarable: false,
                description: item.description || item.title,
                incoterm: 'DAP',
                unitOfMeasurement: 'metric'
            }
        };

        try {
            const response = await axios.post(`${this.baseUrl}/shipments`, shipmentData, {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/json'
                }
            });

            return {
                trackingNumber: response.data.shipmentTrackingNumber,
                labelData: response.data.documents[0].content, // Base64 PDF
                trackingUrl: response.data.trackingUrl
            };
        } catch (error) {
            console.error('DHL API Error:', error.response?.data || error.message);
            throw new Error(error.response?.data?.detail || 'Failed to create DHL shipment');
        }
    }
}

export default new DHLService();
