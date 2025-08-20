/* ForestApp PWA - IndexedDB Database Layer */
console.log('📚 Loading database.js...');

class ForestDatabase {
    constructor() {
        this.dbName = 'ForestAppDB';
        this.version = 1;
        this.db = null;
    }

    // Initialize database connection
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('❌ Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                console.log('🔧 Database upgrade needed');
                this.db = e.target.result;
                this.createTables();
            };
        });
    }

    // Create database schema
    createTables() {
        // Projects table
        if (!this.db.objectStoreNames.contains('projects')) {
            const projectStore = this.db.createObjectStore('projects', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            projectStore.createIndex('name', 'name', { unique: false });
            projectStore.createIndex('createdAt', 'createdAt', { unique: false });
            projectStore.createIndex('status', 'status', { unique: false });
        }

        // Sample trees table
        if (!this.db.objectStoreNames.contains('sampleTrees')) {
            const sampleStore = this.db.createObjectStore('sampleTrees', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            sampleStore.createIndex('projectId', 'projectId', { unique: false });
            sampleStore.createIndex('area', 'area', { unique: false });
            sampleStore.createIndex('species', 'species', { unique: false });
            sampleStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Inventory trees table
        if (!this.db.objectStoreNames.contains('inventoryTrees')) {
            const inventoryStore = this.db.createObjectStore('inventoryTrees', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            inventoryStore.createIndex('projectId', 'projectId', { unique: false });
            inventoryStore.createIndex('species', 'species', { unique: false });
            inventoryStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Height averages table
        if (!this.db.objectStoreNames.contains('heightAverages')) {
            const heightStore = this.db.createObjectStore('heightAverages', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            heightStore.createIndex('projectId', 'projectId', { unique: false });
            heightStore.createIndex('species', 'species', { unique: false });
        }

        // Settings table
        if (!this.db.objectStoreNames.contains('settings')) {
            const settingsStore = this.db.createObjectStore('settings', { 
                keyPath: 'key' 
            });
        }

        console.log('📋 Database tables created');
    }

    // Generic transaction handler
    async executeTransaction(storeName, mode, operation) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            
            const request = operation(store);
            
            if (request) {
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            }
        });
    }

    // PROJECT OPERATIONS
    async createProject(projectData) {
        const project = {
            name: projectData.name,
            description: projectData.description || '',
            operator: projectData.operator,
            inventoryAreaHa: projectData.inventoryAreaHa || 30.0,
            location: projectData.location || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active'
        };

        return this.executeTransaction('projects', 'readwrite', (store) => {
            return store.add(project);
        });
    }

    async getProjects() {
        return this.executeTransaction('projects', 'readonly', (store) => {
            return store.getAll();
        });
    }

    async getProject(id) {
        return this.executeTransaction('projects', 'readonly', (store) => {
            return store.get(id);
        });
    }

    async updateProject(id, updates) {
        const project = await this.getProject(id);
        if (!project) throw new Error('Project not found');
        
        const updatedProject = {
            ...project,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        return this.executeTransaction('projects', 'readwrite', (store) => {
            return store.put(updatedProject);
        });
    }

    async deleteProject(id) {
        // Delete all related data first
        await this.deleteSampleTreesByProject(id);
        await this.deleteInventoryTreesByProject(id);
        await this.deleteHeightAveragesByProject(id);
        
        // Delete project
        return this.executeTransaction('projects', 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    // SAMPLE TREES OPERATIONS
    async addSampleTree(projectId, treeData) {
        const tree = {
            projectId: projectId,
            area: treeData.area,
            species: treeData.species,
            diameterClass: treeData.diameterClass,
            height: treeData.height,
            timestamp: treeData.timestamp || new Date().toISOString(),
            operator: treeData.operator,
            gps: treeData.gps || null,
            synced: false
        };

        return this.executeTransaction('sampleTrees', 'readwrite', (store) => {
            return store.add(tree);
        });
    }

    async getSampleTrees(projectId, area = null) {
        return this.executeTransaction('sampleTrees', 'readonly', (store) => {
            const index = store.index('projectId');
            return index.getAll(projectId);
        }).then(trees => {
            if (area) {
                return trees.filter(tree => tree.area === area);
            }
            return trees;
        });
    }

    async deleteSampleTree(id) {
        return this.executeTransaction('sampleTrees', 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async deleteSampleTreesByProject(projectId) {
        const trees = await this.getSampleTrees(projectId);
        const promises = trees.map(tree => this.deleteSampleTree(tree.id));
        return Promise.all(promises);
    }

    // INVENTORY TREES OPERATIONS
    async addInventoryTree(projectId, treeData) {
        const tree = {
            projectId: projectId,
            species: treeData.species,
            diameterClass: treeData.diameterClass,
            timestamp: treeData.timestamp || new Date().toISOString(),
            operator: treeData.operator,
            gps: treeData.gps || null,
            synced: false
        };

        return this.executeTransaction('inventoryTrees', 'readwrite', (store) => {
            return store.add(tree);
        });
    }

    async getInventoryTrees(projectId) {
        return this.executeTransaction('inventoryTrees', 'readonly', (store) => {
            const index = store.index('projectId');
            return index.getAll(projectId);
        });
    }

    async deleteInventoryTree(id) {
        return this.executeTransaction('inventoryTrees', 'readwrite', (store) => {
            return store.delete(id);
        });
    }

    async deleteInventoryTreesByProject(projectId) {
        const trees = await this.getInventoryTrees(projectId);
        const promises = trees.map(tree => this.deleteInventoryTree(tree.id));
        return Promise.all(promises);
    }

    // HEIGHT AVERAGES OPERATIONS
    async saveHeightAverages(projectId, averages) {
        // Delete existing averages for this project
        await this.deleteHeightAveragesByProject(projectId);
        
        // Add new averages
        const promises = Object.entries(averages).map(([species, data]) => {
            const record = {
                projectId: projectId,
                species: species,
                average: data.average,
                count: data.count,
                min: data.min,
                max: data.max,
                updatedAt: new Date().toISOString()
            };
            
            return this.executeTransaction('heightAverages', 'readwrite', (store) => {
                return store.add(record);
            });
        });

        return Promise.all(promises);
    }

    async getHeightAverages(projectId) {
        const records = await this.executeTransaction('heightAverages', 'readonly', (store) => {
            const index = store.index('projectId');
            return index.getAll(projectId);
        });

        // Convert back to object format
        const averages = {};
        records.forEach(record => {
            averages[record.species] = {
                average: record.average,
                count: record.count,
                min: record.min,
                max: record.max
            };
        });

        return averages;
    }

    async deleteHeightAveragesByProject(projectId) {
        const records = await this.executeTransaction('heightAverages', 'readonly', (store) => {
            const index = store.index('projectId');
            return index.getAll(projectId);
        });

        const promises = records.map(record => {
            return this.executeTransaction('heightAverages', 'readwrite', (store) => {
                return store.delete(record.id);
            });
        });

        return Promise.all(promises);
    }

    // SETTINGS OPERATIONS
    async getSetting(key, defaultValue = null) {
        try {
            const result = await this.executeTransaction('settings', 'readonly', (store) => {
                return store.get(key);
            });
            return result ? result.value : defaultValue;
        } catch (error) {
            return defaultValue;
        }
    }

    async setSetting(key, value) {
        const setting = { key, value, updatedAt: new Date().toISOString() };
        return this.executeTransaction('settings', 'readwrite', (store) => {
            return store.put(setting);
        });
    }

    // DATA EXPORT OPERATIONS
    async exportProject(projectId) {
        const project = await this.getProject(projectId);
        const sampleTrees = await this.getSampleTrees(projectId);
        const inventoryTrees = await this.getInventoryTrees(projectId);
        const heightAverages = await this.getHeightAverages(projectId);

        return {
            project,
            sampleTrees,
            inventoryTrees,
            heightAverages,
            exportedAt: new Date().toISOString(),
            version: '2.0.0'
        };
    }

    async exportAllData() {
        const projects = await this.getProjects();
        const allData = {
            projects: [],
            exportedAt: new Date().toISOString(),
            version: '2.0.0'
        };

        for (const project of projects) {
            const projectData = await this.exportProject(project.id);
            allData.projects.push(projectData);
        }

        return allData;
    }

    // DATA IMPORT OPERATIONS
    async importProject(projectData) {
        try {
            // Create project (without ID to get new ID)
            const projectToImport = { ...projectData.project };
            delete projectToImport.id;
            projectToImport.name = `${projectToImport.name} (Imported)`;
            
            const newProjectId = await this.createProject(projectToImport);

            // Import sample trees
            for (const tree of projectData.sampleTrees) {
                const treeToImport = { ...tree };
                delete treeToImport.id;
                await this.addSampleTree(newProjectId, treeToImport);
            }

            // Import inventory trees
            for (const tree of projectData.inventoryTrees) {
                const treeToImport = { ...tree };
                delete treeToImport.id;
                await this.addInventoryTree(newProjectId, treeToImport);
            }

            // Import height averages
            if (projectData.heightAverages && Object.keys(projectData.heightAverages).length > 0) {
                await this.saveHeightAverages(newProjectId, projectData.heightAverages);
            }

            return newProjectId;
        } catch (error) {
            console.error('❌ Import failed:', error);
            throw error;
        }
    }

    // DATABASE STATISTICS
    async getDatabaseStats() {
        const projects = await this.getProjects();
        let totalSampleTrees = 0;
        let totalInventoryTrees = 0;

        for (const project of projects) {
            const sampleTrees = await this.getSampleTrees(project.id);
            const inventoryTrees = await this.getInventoryTrees(project.id);
            totalSampleTrees += sampleTrees.length;
            totalInventoryTrees += inventoryTrees.length;
        }

        return {
            projects: projects.length,
            sampleTrees: totalSampleTrees,
            inventoryTrees: totalInventoryTrees,
            lastUpdate: new Date().toISOString()
        };
    }

    // SYNC STATUS OPERATIONS
    async markTreesAsSynced(projectId, treeIds, type = 'inventory') {
        const storeName = type === 'sample' ? 'sampleTrees' : 'inventoryTrees';
        
        const promises = treeIds.map(id => {
            return this.executeTransaction(storeName, 'readwrite', (store) => {
                return store.get(id).then(tree => {
                    if (tree) {
                        tree.synced = true;
                        tree.syncedAt = new Date().toISOString();
                        return store.put(tree);
                    }
                });
            });
        });

        return Promise.all(promises);
    }

    async getUnsyncedTrees(projectId) {
        const sampleTrees = await this.getSampleTrees(projectId);
        const inventoryTrees = await this.getInventoryTrees(projectId);

        return {
            sampleTrees: sampleTrees.filter(tree => !tree.synced),
            inventoryTrees: inventoryTrees.filter(tree => !tree.synced)
        };
    }
}

// Global database instance
let forestDB = null;

// Initialize database
async function initializeDatabase() {
    if (!forestDB) {
        forestDB = new ForestDatabase();
        await forestDB.init();
    }
    return forestDB;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ForestDatabase, initializeDatabase };
}

console.log('🗄️ ForestApp Database layer loaded successfully!');