import { SupabaseClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Locate the local mock database file at the project root
const MOCK_DB_PATH = path.join(process.cwd(), 'mock-db.json')

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function readDb() {
  try {
    if (!fs.existsSync(MOCK_DB_PATH)) {
      const initial = {
        trips: [],
        places: [],
        lists: [],
        list_items: [],
        itinerary_items: [],
        flights: [],
        lodgings: []
      }
      fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initial, null, 2), 'utf-8')
      return initial
    }
    return JSON.parse(fs.readFileSync(MOCK_DB_PATH, 'utf-8'))
  } catch (error) {
    console.error("Error reading mock DB:", error)
    return {
      trips: [],
      places: [],
      lists: [],
      list_items: [],
      itinerary_items: [],
      flights: [],
      lodgings: []
    }
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error("Error writing mock DB:", error)
  }
}

class MockQueryBuilder {
  private tableName: string
  private filters: Array<{ column: string; operator: string; value: any }> = []
  private sorts: Array<{ column: string; ascending: boolean }> = []
  private limitCount: number | null = null
  private isSingle: boolean = false
  private isMaybeSingle: boolean = false
  private isInsert: boolean = false
  private isUpdate: boolean = false
  private isUpsert: boolean = false
  private isDelete: boolean = false
  private queryData: any = null
  private upsertOptions: any = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(columns?: string) {
    return this
  }

  insert(data: any) {
    this.isInsert = true
    this.queryData = data
    return this
  }

  update(data: any) {
    this.isUpdate = true
    this.queryData = data
    return this
  }

  upsert(data: any, options?: any) {
    this.isUpsert = true
    this.queryData = data
    this.upsertOptions = options
    return this
  }

  delete() {
    this.isDelete = true
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ column, operator: 'neq', value })
    return this
  }

  is(column: string, value: any) {
    this.filters.push({ column, operator: 'is', value })
    return this
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, operator: 'in', value: values })
    return this
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.sorts.push({ column, ascending: options?.ascending ?? true })
    return this
  }

  limit(count: number) {
    this.limitCount = count
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  private execute() {
    const db = readDb()
    if (!db[this.tableName]) {
      db[this.tableName] = []
    }
    let table = db[this.tableName]

    if (this.isInsert) {
      const items = Array.isArray(this.queryData) ? this.queryData : [this.queryData]
      const inserted: any[] = []
      for (const item of items) {
        const newItem = {
          id: item.id || generateUuid(),
          created_at: new Date().toISOString(),
          ...item
        }
        table.push(newItem)
        inserted.push(newItem)
      }
      writeDb(db)
      
      const resData = Array.isArray(this.queryData) ? inserted : inserted[0]
      if (this.isSingle) {
        return { data: resData, error: null }
      }
      return { data: inserted, error: null }
    }

    if (this.isUpsert) {
      const items = Array.isArray(this.queryData) ? this.queryData : [this.queryData]
      const upserted: any[] = []
      const onConflict = this.upsertOptions?.onConflict

      for (const item of items) {
        let existingIndex = -1
        if (onConflict === 'google_place_id') {
          existingIndex = table.findIndex((x: any) => x.google_place_id === item.google_place_id)
        } else if (onConflict === 'list_id, place_id') {
          existingIndex = table.findIndex((x: any) => x.list_id === item.list_id && x.place_id === item.place_id)
        } else {
          existingIndex = table.findIndex((x: any) => x.id === item.id)
        }

        if (existingIndex > -1) {
          table[existingIndex] = {
            ...table[existingIndex],
            ...item
          }
          upserted.push(table[existingIndex])
        } else {
          const newItem = {
            id: item.id || generateUuid(),
            created_at: new Date().toISOString(),
            ...item
          }
          table.push(newItem)
          upserted.push(newItem)
        }
      }
      writeDb(db)
      
      const resData = Array.isArray(this.queryData) ? upserted : upserted[0]
      if (this.isSingle) {
        return { data: resData, error: null }
      }
      return { data: upserted, error: null }
    }

    if (this.isUpdate) {
      let affectedCount = 0
      const updatedItems: any[] = []
      table = table.map((item: any) => {
        let matches = true
        for (const filter of this.filters) {
          if (filter.operator === 'eq' && item[filter.column] !== filter.value) matches = false
          if (filter.operator === 'neq' && item[filter.column] === filter.value) matches = false
          if (filter.operator === 'is') {
            if (filter.value === null && item[filter.column] !== null && item[filter.column] !== undefined) matches = false
            else if (filter.value !== null && item[filter.column] !== filter.value) matches = false
          }
          if (filter.operator === 'in' && (!Array.isArray(filter.value) || !filter.value.includes(item[filter.column]))) matches = false
        }
        if (matches) {
          affectedCount++
          const updatedItem = {
            ...item,
            ...this.queryData
          }
          updatedItems.push(updatedItem)
          return updatedItem
        }
        return item
      })
      db[this.tableName] = table
      writeDb(db)

      if (this.isSingle || this.isMaybeSingle) {
        return { data: updatedItems[0] || null, error: null }
      }
      return { data: updatedItems, error: null }
    }

    if (this.isDelete) {
      const remaining: any[] = []
      const deleted: any[] = []
      for (const item of table) {
        let matches = true
        for (const filter of this.filters) {
          if (filter.operator === 'eq' && item[filter.column] !== filter.value) matches = false
          if (filter.operator === 'neq' && item[filter.column] === filter.value) matches = false
          if (filter.operator === 'is') {
            if (filter.value === null && item[filter.column] !== null && item[filter.column] !== undefined) matches = false
            else if (filter.value !== null && item[filter.column] !== filter.value) matches = false
          }
          if (filter.operator === 'in' && (!Array.isArray(filter.value) || !filter.value.includes(item[filter.column]))) matches = false
        }
        if (matches) {
          deleted.push(item)
        } else {
          remaining.push(item)
        }
      }
      db[this.tableName] = remaining
      writeDb(db)
      return { data: deleted, error: null }
    }

    // Default SELECT
    let results = [...table]

    for (const filter of this.filters) {
      results = results.filter((item: any) => {
        if (filter.operator === 'eq') {
          return item[filter.column] === filter.value
        }
        if (filter.operator === 'neq') {
          return item[filter.column] !== filter.value
        }
        if (filter.operator === 'is') {
          if (filter.value === null) {
            return item[filter.column] === null || item[filter.column] === undefined
          }
          return item[filter.column] === filter.value
        }
        if (filter.operator === 'in') {
          return Array.isArray(filter.value) && filter.value.includes(item[filter.column])
        }
        return true
      })
    }

    for (const sort of this.sorts) {
      results.sort((a: any, b: any) => {
        const valA = a[sort.column]
        const valB = b[sort.column]
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1
        
        let comparison = 0
        if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB)
        } else {
          comparison = valA < valB ? -1 : 1
        }
        return sort.ascending ? comparison : -comparison
      })
    }

    if (this.limitCount !== null) {
      results = results.slice(0, this.limitCount)
    }

    if (this.isSingle) {
      if (results.length === 0) {
        return { data: null, error: { message: "No rows found" } }
      }
      return { data: results[0], error: null }
    }

    if (this.isMaybeSingle) {
      return { data: results[0] || null, error: null }
    }

    return { data: results, error: null }
  }

  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    const result = this.execute()
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}

const mockSupabaseClient = {
  from(tableName: string) {
    return new MockQueryBuilder(tableName)
  },
  auth: {
    getUser: async () => ({ data: { user: { id: "00000000-0000-0000-0000-000000000000", email: "test@example.com" } }, error: null }),
    getSession: async () => ({ data: { session: { access_token: "mock-token", user: { id: "00000000-0000-0000-0000-000000000000", email: "test@example.com" } } }, error: null }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  }
}

export const supabase = mockSupabaseClient as unknown as SupabaseClient

export function createServerClient(accessToken: string): SupabaseClient {
  return mockSupabaseClient as unknown as SupabaseClient
}
