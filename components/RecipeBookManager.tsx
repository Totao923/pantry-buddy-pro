import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { RecipeBook, RecipeBookWithRecipes, Recipe, PDFTemplate } from '../types';
import { RecipeBookPDFExporter } from './RecipeBookPDFExporter';
import { cookingSessionService, CookingSession } from '../lib/services/cookingSessionService';

interface RecipeBookManagerProps {
  savedRecipes: Recipe[];
}

interface RecipeSelectorProps {
  recipes: Recipe[];
  onConfirm: (selectedIds: string[]) => void;
  onCancel: () => void;
}

function RecipeSelector({ recipes, onConfirm, onCancel }: RecipeSelectorProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'recent' | 'meal-plan' | 'cooked'>(
    'all'
  );
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>(recipes);

  // Load cooked recipe IDs from cooking sessions
  useEffect(() => {
    const loadCookedRecipeIds = async () => {
      try {
        const sessions = await cookingSessionService.getUserCookingSessions(200);
        const cookedIds = sessions.map(session => session.recipe_id);

        console.log('🔍 RecipeSelector filter:', filter);
        console.log('📚 Total recipes:', recipes.length);
        console.log(
          '📝 All recipe IDs:',
          recipes.map(r => ({ id: r.id, title: r.title }))
        );
        console.log('🍳 Cooked recipe IDs from sessions:', cookedIds);
        console.log('🔍 Number of cooking sessions:', sessions.length);

        // Apply filter
        let filtered = [...recipes];

        if (filter === 'favorites') {
          const favoriteIds = JSON.parse(localStorage.getItem('favoriteRecipes') || '[]');
          console.log('⭐ Favorite IDs from localStorage:', favoriteIds);
          console.log(
            '📝 Recipe IDs available:',
            recipes.map(r => r.id)
          );
          filtered = filtered.filter(recipe => favoriteIds.includes(recipe.id));
          console.log('⭐ Filtered favorites:', filtered.length);
          console.log(
            '⭐ Favorite recipes:',
            filtered.map(r => ({ id: r.id, title: r.title }))
          );
        } else if (filter === 'recent') {
          // Show recipes from last 7 days (for now, show all)
          filtered = filtered;
        } else if (filter === 'meal-plan') {
          filtered = filtered.filter(recipe => recipe.tags?.includes('meal-plan'));
          console.log('📋 Filtered meal-plan recipes:', filtered.length);
        } else if (filter === 'cooked') {
          console.log('🔍 Checking each recipe against cooked IDs...');
          filtered = filtered.filter(recipe => {
            const isCooked = cookedIds.includes(recipe.id);
            console.log(`${isCooked ? '✅' : '❌'} Recipe: "${recipe.title}" (ID: ${recipe.id})`);
            return isCooked;
          });
          console.log('🍳 Filtered cooked recipes:', filtered.length);
          console.log(
            '🍳 Cooked recipes found:',
            filtered.map(r => ({ id: r.id, title: r.title }))
          );
        }

        setFilteredRecipes(filtered);
      } catch (error) {
        console.error('Failed to load cooked recipes:', error);
        setFilteredRecipes(recipes);
      }
    };

    loadCookedRecipeIds();
  }, [recipes, filter]);

  const toggleRecipe = (recipeId: string) => {
    setSelectedIds(prev =>
      prev.includes(recipeId) ? prev.filter(id => id !== recipeId) : [...prev, recipeId]
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Select Recipes for Recipe Book</h2>
          <p className="text-gray-600 mt-1">Choose which recipes to include in your recipe book</p>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4 overflow-x-auto">
            {[
              { key: 'all', label: 'All Recipes' },
              { key: 'favorites', label: 'Favorites' },
              { key: 'recent', label: 'Recent' },
              { key: 'meal-plan', label: 'Meal Plans' },
              { key: 'cooked', label: 'Cooked Recipes' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === tab.key
                    ? 'bg-pantry-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(recipe.id)}
                    onChange={() => toggleRecipe(recipe.id)}
                    className="mt-1 rounded text-pantry-600 focus:ring-pantry-500"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{recipe.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <span>🍽️ {recipe.servings} servings</span>
                      <span>⏱️ {recipe.totalTime} min</span>
                      <span>📊 {recipe.difficulty}</span>
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            {selectedIds.length} recipe{selectedIds.length !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(selectedIds)}
              disabled={selectedIds.length === 0}
              className="px-6 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add {selectedIds.length} Recipe{selectedIds.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecipeBookManager({ savedRecipes }: RecipeBookManagerProps) {
  const { user, subscription } = useAuth();
  const [recipeBooks, setRecipeBooks] = useState<RecipeBook[]>([]);
  const [selectedBook, setSelectedBook] = useState<RecipeBookWithRecipes | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPDFExporter, setShowPDFExporter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [bookToEdit, setBookToEdit] = useState<RecipeBook | null>(null);

  const isPremium =
    subscription?.tier === 'premium' ||
    subscription?.tier === 'family' ||
    subscription?.tier === 'chef';
  const maxBooks = isPremium ? 50 : 1;

  useEffect(() => {
    loadRecipeBooks();
  }, [user]);

  const loadRecipeBooks = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load recipe books from localStorage for now
      const storageKey = `recipe-books-${user.id}`;
      const stored = localStorage.getItem(storageKey);
      const storedBooks: RecipeBook[] = stored ? JSON.parse(stored) : [];

      // Convert date strings back to Date objects
      const books = storedBooks.map(book => ({
        ...book,
        createdAt: new Date(book.createdAt),
        updatedAt: new Date(book.updatedAt),
      }));

      setRecipeBooks(books);
    } catch (error) {
      console.error('Failed to load recipe books:', error);
      setRecipeBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRecipeBooks = (books: RecipeBook[]) => {
    if (!user) return;
    const storageKey = `recipe-books-${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(books));
  };

  const createRecipeBook = async (bookData: Partial<RecipeBook>) => {
    if (!user || recipeBooks.length >= maxBooks) return;

    const newBook: RecipeBook = {
      id: Date.now().toString(),
      userId: user.id,
      name: bookData.name || 'Untitled Book',
      description: bookData.description || '',
      template: 'elegant',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      recipeCount: 0,
    };

    const updatedBooks = [...recipeBooks, newBook];
    setRecipeBooks(updatedBooks);
    saveRecipeBooks(updatedBooks);
    setShowCreateModal(false);
  };

  const deleteRecipeBook = async (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe book?')) {
      const updatedBooks = recipeBooks.filter(book => book.id !== bookId);
      setRecipeBooks(updatedBooks);
      saveRecipeBooks(updatedBooks);
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
      }
    }
  };

  const openBook = async (book: RecipeBook) => {
    console.log('openBook called with book:', book);

    try {
      // Load cooking sessions to get recipes with photos
      const cookingSessions = await cookingSessionService.getUserCookingSessions(200);

      // Filter to only recipes that have been cooked (with cooking sessions)
      const cookedRecipeIds = new Set(cookingSessions.map(session => session.recipe_id));
      const cookedRecipes = savedRecipes.filter(recipe => cookedRecipeIds.has(recipe.id));

      if (cookedRecipes.length > 0) {
        // Automatically create book with all cooked recipes
        const bookWithRecipes = createBookWithSelectedRecipes(
          book,
          cookedRecipes.map(r => r.id)
        );
        setSelectedBook(bookWithRecipes);
        console.log(`Auto-populated book with ${cookedRecipes.length} cooked recipes`);
      } else {
        // Fallback to recipe selector if no cooked recipes
        setShowRecipeSelector(true);
        setBookToEdit(book);
        console.log('No cooked recipes found, showing recipe selector');
      }
    } catch (error) {
      console.error('Failed to load cooking sessions:', error);
      // Fallback to recipe selector
      setShowRecipeSelector(true);
      setBookToEdit(book);
    }
  };

  const addRecipesToBook = async (book: RecipeBook) => {
    // Show recipe selection modal for adding recipes (keep current book selected)
    setShowRecipeSelector(true);
    setBookToEdit(book);
  };

  const removeRecipeFromBook = (recipeId: string, recipeTitle: string) => {
    if (!selectedBook) return;

    if (window.confirm(`Remove "${recipeTitle}" from this recipe book?`)) {
      // Remove from main recipes array
      const updatedRecipes = selectedBook.recipes.filter(recipe => recipe.id !== recipeId);

      // Remove from all sections
      const updatedSections = selectedBook.sections.map(section => ({
        ...section,
        recipes: section.recipes.filter(recipe => recipe.id !== recipeId),
      }));

      // Update the selected book
      const updatedBook: RecipeBookWithRecipes = {
        ...selectedBook,
        recipes: updatedRecipes,
        sections: updatedSections,
      };

      setSelectedBook(updatedBook);
    }
  };

  const createBookWithSelectedRecipes = (book: RecipeBook, selectedRecipeIds: string[]) => {
    const selectedRecipes = savedRecipes.filter(recipe => selectedRecipeIds.includes(recipe.id));
    const recipesWithBookItems = selectedRecipes.map(recipe => ({
      ...recipe,
      bookItem: {
        id: `item-${recipe.id}`,
        bookId: book.id,
        recipeId: recipe.id,
        order: 1,
        section: 'Main Dishes',
        addedAt: new Date(),
      },
    }));

    const bookWithRecipes: RecipeBookWithRecipes = {
      ...book,
      sections: [
        {
          name: 'Main Dishes',
          recipes: recipesWithBookItems,
        },
      ],
      recipes: recipesWithBookItems,
    };

    // Set this as the currently selected book
    setSelectedBook(bookWithRecipes);
    return bookWithRecipes;
  };

  const handleRecipeSelection = (selectedIds: string[]) => {
    if (bookToEdit) {
      if (selectedBook) {
        // Adding recipes to existing opened book
        const selectedRecipes = savedRecipes.filter(recipe => selectedIds.includes(recipe.id));

        // Convert to book items format
        const newRecipeItems = selectedRecipes.map(recipe => ({
          ...recipe,
          bookItem: {
            id: `item-${recipe.id}-${Date.now()}`,
            bookId: bookToEdit.id,
            recipeId: recipe.id,
            order: selectedBook.recipes.length + 1,
            section: 'Main Dishes',
            addedAt: new Date(),
          },
        }));

        // Merge with existing recipes (avoid duplicates)
        const existingRecipeIds = new Set(selectedBook.recipes.map(r => r.id));
        const recipesToAdd = newRecipeItems.filter(recipe => !existingRecipeIds.has(recipe.id));
        const allRecipes = [...selectedBook.recipes, ...recipesToAdd];

        // Update the book with merged recipes
        const updatedBook: RecipeBookWithRecipes = {
          ...selectedBook,
          sections: [
            {
              name: 'Main Dishes',
              recipes: allRecipes,
            },
          ],
          recipes: allRecipes,
        };

        setSelectedBook(updatedBook);
      } else {
        // Opening book for first time - create new book with selected recipes
        createBookWithSelectedRecipes(bookToEdit, selectedIds);
      }

      setShowRecipeSelector(false);
      setBookToEdit(null);
    }
  };

  const CreateBookModal = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
          <h2 className="text-xl font-bold mb-4">Create New Recipe Book</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Book Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                placeholder="Family Favorites, Holiday Recipes, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pantry-500 focus:border-transparent"
                rows={3}
                placeholder="A brief description of your recipe book..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => createRecipeBook({ name, description, template: 'elegant' })}
              disabled={!name.trim()}
              className="px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Create Book
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (selectedBook) {
    return (
      <div className="space-y-6">
        {/* Book Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-pantry-600 hover:text-pantry-700 mb-2 flex items-center gap-2"
              >
                ← Back to Recipe Books
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{selectedBook.name}</h1>
              {selectedBook.description && (
                <p className="text-gray-600 mt-1">{selectedBook.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>{selectedBook.recipes.length} recipes</span>
                <span>Template: {selectedBook.template}</span>
                <span>Updated {selectedBook.updatedAt.toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => addRecipesToBook(selectedBook)}
                className="px-4 py-2 text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
              >
                ➕ Add Recipes
              </button>
              <button
                onClick={() => setShowPDFExporter(true)}
                className="px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors flex items-center gap-2"
              >
                📄 Export PDF
              </button>
              <button
                onClick={() => deleteRecipeBook(selectedBook.id)}
                className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>

        {/* Recipe Sections */}
        <div className="space-y-6">
          {selectedBook.sections.map(section => (
            <div
              key={section.name}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="relative border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
                  >
                    {/* Delete button - only shows on hover */}
                    <button
                      onClick={() => removeRecipeFromBook(recipe.id, recipe.title)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      title={`Remove ${recipe.title} from book`}
                    >
                      🗑️
                    </button>

                    <h3 className="font-medium text-gray-900">{recipe.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                      <span>{recipe.totalTime} min</span>
                      <span>{recipe.servings} servings</span>
                    </div>
                    {recipe.bookItem.personalNotes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-xs">
                        <strong>Notes:</strong> {recipe.bookItem.personalNotes}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {section.recipes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>No recipes in this section yet</p>
                  <button className="mt-2 text-pantry-600 hover:text-pantry-700 text-sm">
                    Add recipes →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* PDF Exporter Modal */}
        {showPDFExporter && (
          <RecipeBookPDFExporter
            recipeBook={selectedBook}
            onClose={() => setShowPDFExporter(false)}
            isPremiumUser={isPremium}
          />
        )}

        {/* Recipe Selector Modal */}
        {showRecipeSelector && bookToEdit && (
          <RecipeSelector
            recipes={savedRecipes}
            onConfirm={handleRecipeSelection}
            onCancel={() => {
              setShowRecipeSelector(false);
              setBookToEdit(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Recipe Books</h1>
            <p className="text-gray-600 mt-1">
              Create beautiful recipe collections and export them as PDFs
            </p>
            <div className="mt-2">
              <span className="text-sm text-gray-500">
                {recipeBooks.length} / {maxBooks} books
                {!isPremium && (
                  <span className="ml-2 text-amber-600">💎 Upgrade for unlimited books</span>
                )}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={recipeBooks.length >= maxBooks}
            className="px-4 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            + New Recipe Book
          </button>
        </div>
      </div>

      {/* Recipe Books Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pantry-600 mx-auto"></div>
          <p className="text-gray-500 mt-2">Loading recipe books...</p>
        </div>
      ) : recipeBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipeBooks.map(book => (
            <div
              key={book.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{book.name}</h3>
                  {book.description && (
                    <p className="text-sm text-gray-600 mt-1">{book.description}</p>
                  )}
                </div>
                <div className="ml-4 text-right text-xs text-gray-500">
                  <div>{book.recipeCount} recipes</div>
                  <div className="mt-1">{book.template}</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  Created {book.createdAt.toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openBook(book)}
                    className="px-3 py-1 text-pantry-600 border border-pantry-200 rounded hover:bg-pantry-50 transition-colors text-sm"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => deleteRecipeBook(book.id)}
                    className="px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recipe books yet</h3>
          <p className="text-gray-600 mb-4">
            Create your first recipe book to organize your favorite recipes
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 transition-colors"
          >
            Create Your First Book
          </button>
        </div>
      )}

      {/* Create Book Modal */}
      {showCreateModal && <CreateBookModal />}

      {/* Recipe Selector Modal */}
      {showRecipeSelector && bookToEdit && (
        <RecipeSelector
          recipes={savedRecipes}
          onConfirm={handleRecipeSelection}
          onCancel={() => {
            setShowRecipeSelector(false);
            setBookToEdit(null);
          }}
        />
      )}
    </div>
  );
}
