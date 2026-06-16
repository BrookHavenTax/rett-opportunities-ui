import { type NextRequest, NextResponse } from 'next/server';
import { runImportPipeline } from '@/lib/importPipeline';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Optional shared-secret guard until staff-portal SSO is wired up.
  const secret = process.env.ADMIN_SECRET;
  if (secret && req.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let file: File;
  try {
    const form = await req.formData();
    const entry = form.get('file');
    if (!(entry instanceof File)) {
      return NextResponse.json(
        { error: 'No file uploaded (expected form field "file").' },
        { status: 400 },
      );
    }
    file = entry;
  } catch {
    return NextResponse.json(
      { error: 'Invalid multipart/form-data request.' },
      { status: 400 },
    );
  }

  const isXlsx =
    file.name.toLowerCase().endsWith('.xlsx') ||
    file.type ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (!isXlsx) {
    return NextResponse.json(
      { error: 'Only .xlsx files are accepted.' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: 'File exceeds the 25MB limit.' },
      { status: 400 },
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await runImportPipeline(buffer, file.name);
    return NextResponse.json(result, {
      status: result.status === 'failed' ? 500 : 200,
    });
  } catch (err) {
    console.error('[api/import] POST failed:', err);
    return NextResponse.json(
      { error: 'Import failed unexpectedly.' },
      { status: 500 },
    );
  }
}
