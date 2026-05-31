import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import type { ContentAsset } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { concepts, contentAssets } from "../schema.js";
import { fromContentAssetRow, toContentAssetRow } from "../mappers.js";

export class AssetRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(asset: ContentAsset): ContentAsset {
    this.db.insert(contentAssets).values(toContentAssetRow(asset)).run();
    return asset;
  }

  getById(id: string): ContentAsset | undefined {
    const row = this.db.select().from(contentAssets).where(eq(contentAssets.id, id)).get();
    return row ? fromContentAssetRow(row) : undefined;
  }

  list(): ContentAsset[] {
    return this.db.select().from(contentAssets).orderBy(asc(contentAssets.title)).all().map(fromContentAssetRow);
  }

  getAssetsCompatibleWithConcept(conceptId: string): ContentAsset[] {
    const concept = this.db.select().from(concepts).where(eq(concepts.id, conceptId)).get();

    if (!concept) {
      return [];
    }

    return this.db
      .select()
      .from(contentAssets)
      .where(
        or(
          eq(contentAssets.primaryConceptId, concept.id),
          and(
            isNull(contentAssets.primaryConceptId),
            eq(contentAssets.primaryAccountId, concept.accountId),
            sql`json_array_length(${contentAssets.conceptIds}) = 0`
          ),
          sql`EXISTS (SELECT 1 FROM json_each(${contentAssets.conceptIds}) WHERE value = ${concept.id})`,
          sql`json_array_length(${contentAssets.conceptIds}) = 0 AND EXISTS (SELECT 1 FROM json_each(${contentAssets.accountIds}) WHERE value = ${concept.accountId})`
        )
      )
      .orderBy(asc(contentAssets.title))
      .all()
      .map(fromContentAssetRow);
  }

  update(asset: ContentAsset): ContentAsset {
    this.db.update(contentAssets).set(toContentAssetRow(asset)).where(eq(contentAssets.id, asset.id)).run();
    return asset;
  }

  delete(id: string): void {
    this.db.delete(contentAssets).where(eq(contentAssets.id, id)).run();
  }
}
