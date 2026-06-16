import { type NextRequest, NextResponse } from 'next/server';
import { dbConnect } from '@/lib/mongodb';
import { ImportRunModel, serializeImportRun, type IImportRun } from '@/lib/models/ImportRun';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 20));

    const [docs, total] = await Promise.all([
      ImportRunModel.find()
        .sort({ importedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IImportRun[]>(),
      ImportRunModel.countDocuments(),
    ]);

    return NextResponse.json({
      runs: docs.map(serializeImportRun),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err) {
    console.error('[api/import/runs] GET failed:', err);
    return NextResponse.json(
      { error: 'Failed to load import history' },
      { status: 500 },
    );
  }
}
