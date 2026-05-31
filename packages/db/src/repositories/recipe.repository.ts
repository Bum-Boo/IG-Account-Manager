import { asc, eq } from "drizzle-orm";
import type { ContentRecipe } from "@ig-manager/domain";
import type { IgManagerDatabase } from "../database.js";
import { contentRecipes } from "../schema.js";
import { fromContentRecipeRow, toContentRecipeRow } from "../mappers.js";

export class RecipeRepository {
  constructor(private readonly db: IgManagerDatabase) {}

  create(recipe: ContentRecipe): ContentRecipe {
    this.db.insert(contentRecipes).values(toContentRecipeRow(recipe)).run();
    return recipe;
  }

  getById(id: string): ContentRecipe | undefined {
    const row = this.db.select().from(contentRecipes).where(eq(contentRecipes.id, id)).get();
    return row ? fromContentRecipeRow(row) : undefined;
  }

  list(): ContentRecipe[] {
    return this.db.select().from(contentRecipes).orderBy(asc(contentRecipes.name)).all().map(fromContentRecipeRow);
  }

  getByConcept(conceptId: string): ContentRecipe[] {
    return this.db
      .select()
      .from(contentRecipes)
      .where(eq(contentRecipes.conceptId, conceptId))
      .orderBy(asc(contentRecipes.name))
      .all()
      .map(fromContentRecipeRow);
  }

  update(recipe: ContentRecipe): ContentRecipe {
    this.db
      .update(contentRecipes)
      .set(toContentRecipeRow(recipe))
      .where(eq(contentRecipes.id, recipe.id))
      .run();
    return recipe;
  }

  delete(id: string): void {
    this.db.delete(contentRecipes).where(eq(contentRecipes.id, id)).run();
  }
}
