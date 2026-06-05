import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req) {
    try {
        const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
        
        let formData = {};
        
        // Handle URL-encoded form data (from CMS static HTML forms)
        if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
            const data = await req.formData();
            for (const [key, value] of data.entries()) {
                formData[key] = value;
            }
        } 
        // Handle JSON
        else if (req.headers.get('content-type')?.includes('application/json')) {
            formData = await req.json();
        } else {
            return NextResponse.json({ message: 'Unsupported content type' }, { status: 400 });
        }

        const response = await axios.post(`${backendUrl}/api/contact`, formData);

        // Redirect back if it was a standard form submission
        if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
            // Usually we'd redirect back to the referer
            const referer = req.headers.get('referer') || '/';
            // We append a success parameter to show a message if desired
            const separator = referer.includes('?') ? '&' : '?';
            return NextResponse.redirect(`${referer}${separator}success=1`, 303);
        }

        return NextResponse.json(response.data, { status: response.status });
    } catch (error) {
        console.error('API Route Error /api/contact:', error.message);
        
        if (req.headers.get('content-type')?.includes('application/x-www-form-urlencoded')) {
            const referer = req.headers.get('referer') || '/';
            const separator = referer.includes('?') ? '&' : '?';
            return NextResponse.redirect(`${referer}${separator}error=1`, 303);
        }

        return NextResponse.json(
            { message: error.response?.data?.message || 'Internal Server Error' },
            { status: error.response?.status || 500 }
        );
    }
}
