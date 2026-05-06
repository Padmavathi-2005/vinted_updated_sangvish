/**
 * Generates a printable shipping label window
 */
export const printShippingLabel = (order, seller) => {
    const labelWindow = window.open('', '_blank', 'width=800,height=600');
    
    const html = `
        <html>
        <head>
            <title>Shipping Label - #${order.order_number}</title>
            <style>
                body { font-family: 'Inter', system-ui, sans-serif; padding: 40px; color: #1e293b; }
                .label-container { 
                    width: 100%; 
                    max-width: 500px; 
                    margin: 0 auto; 
                    border: 3px solid #000; 
                    padding: 0;
                    background: #fff;
                }
                .label-header {
                    background: #000;
                    color: #fff;
                    padding: 15px;
                    text-align: center;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    font-size: 20px;
                }
                .label-body { padding: 30px; }
                .address-section { margin-bottom: 30px; }
                .address-label { 
                    font-size: 10px; 
                    text-transform: uppercase; 
                    font-weight: 800; 
                    color: #64748b;
                    margin-bottom: 5px;
                    display: block;
                }
                .address-name { font-size: 18px; font-weight: 700; margin-bottom: 5px; }
                .address-text { font-size: 16px; line-height: 1.4; color: #334155; }
                
                .divider { border-top: 1px dashed #cbd5e1; margin: 25px 0; }
                
                .label-footer {
                    background: #f8fafc;
                    padding: 20px;
                    border-top: 2px solid #000;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .order-info { font-size: 12px; font-weight: 600; }
                .barcode-placeholder {
                    background: repeating-linear-gradient(90deg, #000, #000 2px, #fff 2px, #fff 4px);
                    height: 40px;
                    width: 150px;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
                .print-btn {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #0ea5e9;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <button class="print-btn no-print" onclick="window.print()">Print Label</button>
            
            <div class="label-container">
                <div class="label-header">ECONOMY SHIPPING</div>
                
                <div class="label-body">
                    <div class="address-section">
                        <span class="address-label">FROM (Shipper)</span>
                        <div class="address-name">${seller?.username || 'Vinted Seller'}</div>
                        <div class="address-text">
                            ${seller?.address?.address_line || ''}<br>
                            ${seller?.address?.city || ''}, ${seller?.address?.state || ''} ${seller?.address?.pincode || ''}<br>
                            Phone: ${seller?.phone || 'N/A'}
                        </div>
                    </div>
                    
                    <div class="divider"></div>
                    
                    <div class="address-section">
                        <span class="address-label">TO (Receiver)</span>
                        <div class="address-name">${order.shipping_address?.full_name}</div>
                        <div class="address-text">
                            ${order.shipping_address?.address_line}<br>
                            ${order.shipping_address?.city}, ${order.shipping_address?.state} ${order.shipping_address?.pincode}<br>
                            Phone: ${order.shipping_address?.phone}
                        </div>
                    </div>
                </div>
                
                <div class="label-footer">
                    <div class="order-info">
                        ORDER: #${order.order_number}<br>
                        DATE: ${new Date(order.created_at).toLocaleDateString()}
                    </div>
                    <div class="barcode-placeholder"></div>
                </div>
            </div>
            
            <script>
                // Auto print check if needed
                // window.print();
            </script>
        </body>
        </html>
    `;
    
    labelWindow.document.write(html);
    labelWindow.document.close();
};
