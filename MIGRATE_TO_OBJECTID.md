# Migrating from UUID Strings to MongoDB ObjectId

## Why ObjectId?

MongoDB's native `_id` field should be an `ObjectId`, not a UUID string. Benefits:
- ✅ Native MongoDB type
- ✅ Contains timestamp information (creation time)
- ✅ More efficient storage (12 bytes vs 36 bytes for UUID string)
- ✅ Better indexing performance
- ✅ Standard MongoDB practice

## Current Issue

Your entities are using:
```typescript
@PrimaryColumn()
id: string;

@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = randomUUID(); // ❌ UUID string
  }
}
```

## Solution

### Option 1: Use ObjectId (Recommended)

Change to:
```typescript
import { ObjectId } from 'mongodb';

@PrimaryColumn({ type: 'string' })
id: string;

@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = new ObjectId().toString(); // ✅ ObjectId as string
  }
}
```

**Note:** TypeORM MongoDB stores ObjectId as string in TypeScript, but MongoDB stores it as ObjectId.

### Option 2: Let MongoDB Auto-Generate

Remove the `@BeforeInsert()` and let MongoDB generate `_id` automatically:
```typescript
@PrimaryColumn({ type: 'string' })
_id: string; // MongoDB will auto-generate this

// Remove generateId() method
```

Then use `_id` instead of `id` throughout your code.

## Migration Strategy

### For New Data

1. Update all entity files to use `ObjectId` instead of `randomUUID()`
2. New records will automatically use ObjectId

### For Existing Data

You have two options:

#### Option A: Keep Existing Data as Strings (Easier)

- Keep existing UUID strings
- Only new records will use ObjectId
- Mixed types in database (not ideal but works)

#### Option B: Migrate All Data (Recommended but Complex)

1. **Backup your database first!**

2. **Create a migration script:**
```typescript
// scripts/migrate-to-objectid.ts
import { MongoClient, ObjectId } from 'mongodb';

async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
  const db = client.db(process.env.DB_NAME);

  const collections = ['users', 'investments', 'investment_opportunities', /* ... */];

  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    const docs = await collection.find({}).toArray();

    for (const doc of docs) {
      // Only migrate if _id is a UUID string (36 chars)
      if (doc._id && typeof doc._id === 'string' && doc._id.length === 36) {
        const newId = new ObjectId();
        
        // Update document with new ObjectId
        await collection.updateOne(
          { _id: doc._id },
          { $set: { _id: newId, id: newId.toString() } }
        );

        // Update all references in other collections
        // This is complex - you need to update all foreign keys
        for (const otherCollection of collections) {
          if (otherCollection !== collectionName) {
            await db.collection(otherCollection).updateMany(
              { [`${collectionName}Id`]: doc._id },
              { $set: { [`${collectionName}Id`]: newId.toString() } }
            );
          }
        }
      }
    }
  }

  await client.close();
}
```

**⚠️ Warning:** This migration is complex and risky. Test thoroughly on a copy of your database first!

## Recommended Approach

For now, I recommend:

1. **Update entity files** to use `ObjectId` for new records
2. **Keep existing UUID strings** as-is (they'll still work)
3. **Plan a migration** for later when you have time to test thoroughly

This way:
- ✅ New records use proper ObjectId
- ✅ Existing records continue to work
- ✅ No risk of breaking production
- ✅ Can migrate existing data later when ready

## Files to Update

Update these entity files:
- `src/entities/user.entity.ts`
- `src/entities/investment.entity.ts`
- `src/entities/investment-opportunity.entity.ts`
- `src/entities/transaction.entity.ts`
- `src/entities/user-profile.entity.ts`
- `src/entities/asset.entity.ts`
- `src/entities/notification.entity.ts`
- `src/entities/issuance.entity.ts`
- `src/entities/project.entity.ts`
- `src/entities/document.entity.ts`
- `src/entities/webinar.entity.ts`
- `src/entities/post.entity.ts`
- `src/entities/admin.entity.ts`
- `src/entities/email-token.entity.ts`
- `src/entities/investment-opportunity-document.entity.ts`

## Example Entity Update

**Before:**
```typescript
import { randomUUID } from 'crypto';

@PrimaryColumn()
id: string;

@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = randomUUID();
  }
}
```

**After:**
```typescript
import { ObjectId } from 'mongodb';

@PrimaryColumn({ type: 'string' })
id: string;

@BeforeInsert()
generateId() {
  if (!this.id) {
    this.id = new ObjectId().toString();
  }
}
```

## Testing

After updating:
1. Create a new record
2. Check MongoDB: `db.users.findOne()` - `_id` should be ObjectId type
3. Verify queries still work
4. Test all CRUD operations

