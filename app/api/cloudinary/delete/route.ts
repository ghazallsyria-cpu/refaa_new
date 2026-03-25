import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { public_id, resource_type = 'image' } = await req.json();

    if (!public_id) {
      return NextResponse.json({ error: 'public_id is required' }, { status: 400 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary API Key or Secret is missing in environment variables');
      return NextResponse.json({ error: 'Cloudinary is not configured on the server' }, { status: 500 });
    }

    const result = await cloudinary.uploader.destroy(public_id, {
      resource_type: resource_type,
    });

    if (result.result === 'ok' || result.result === 'not found') {
      return NextResponse.json({ success: true, result: result.result });
    } else {
      console.error('Cloudinary deletion failed:', result);
      return NextResponse.json({ error: 'Failed to delete from Cloudinary', details: result }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in Cloudinary delete API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
