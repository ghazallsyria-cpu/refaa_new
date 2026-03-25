export function getPublicIdFromUrl(url: string): string | null {
  if (!url || !url.includes('cloudinary.com')) return null;
  
  try {
    // Standard Cloudinary URL format:
    // https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/v<version>/<public_id>.<extension>
    // or without version:
    // https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/<public_id>.<extension>
    
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // The public_id starts after 'upload/' and potentially after 'v<version>/'
    let publicIdWithExtension = parts.slice(uploadIndex + 1).join('/');
    
    // Remove version if present (e.g., v1234567890/)
    if (publicIdWithExtension.startsWith('v') && /v\d+/.test(publicIdWithExtension.split('/')[0])) {
      publicIdWithExtension = publicIdWithExtension.split('/').slice(1).join('/');
    }
    
    // Remove extension
    const lastDotIndex = publicIdWithExtension.lastIndexOf('.');
    if (lastDotIndex === -1) return publicIdWithExtension;
    
    return publicIdWithExtension.substring(0, lastDotIndex);
  } catch (error) {
    console.error('Error extracting public_id from Cloudinary URL:', error);
    return null;
  }
}

export async function deleteFromCloudinary(url: string, resourceType: 'image' | 'video' | 'raw' = 'image') {
  const publicId = getPublicIdFromUrl(url);
  if (!publicId) return { success: false, error: 'Could not extract public_id from URL' };

  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Cloudinary deletion failed:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true, result: data.result };
  } catch (error: any) {
    console.error('Error calling Cloudinary delete API:', error);
    return { success: false, error: error.message };
  }
}
