import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth/AuthProvider';
import { RecipeBook, RecipeBookWithRecipes, Recipe, PDFTemplate } from '../types';
import { RecipeBookPDFExporter } from './RecipeBookPDFExporter';

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
        </div>

        <div className="p-6 overflow-y-auto max-h-96">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipes.map(recipe => (
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

const PDF_TEMPLATES: PDFTemplate[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean, simple design perfect for everyday cooking',
    isPremium: false,
    thumbnail: '/templates/minimalist.png',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Beautiful typography and spacing for special occasions',
    isPremium: true,
    thumbnail: '/templates/elegant.png',
  },
  {
    id: 'family',
    name: 'Family Style',
    description: 'Warm, family-friendly design with personal touches',
    isPremium: true,
    thumbnail: '/templates/family.png',
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Restaurant-quality layout for serious cooks',
    isPremium: true,
    thumbnail: '/templates/professional.png',
  },
];

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
      // Mock data for now - replace with actual API call
      const mockBooks: RecipeBook[] = [
        {
          id: '1',
          userId: user.id,
          name: 'Family Favorites',
          description: 'Our most loved recipes passed down through generations',
          template: 'family',
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          recipeCount: 5,
        },
      ];
      setRecipeBooks(mockBooks);
    } catch (error) {
      console.error('Failed to load recipe books:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRecipeBook = async (bookData: Partial<RecipeBook>) => {
    if (!user || recipeBooks.length >= maxBooks) return;

    const newBook: RecipeBook = {
      id: Date.now().toString(),
      userId: user.id,
      name: bookData.name || 'Untitled Book',
      description: bookData.description || '',
      template: bookData.template || 'minimalist',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      recipeCount: 0,
    };

    setRecipeBooks([...recipeBooks, newBook]);
    setShowCreateModal(false);
  };

  const deleteRecipeBook = async (bookId: string) => {
    if (window.confirm('Are you sure you want to delete this recipe book?')) {
      setRecipeBooks(recipeBooks.filter(book => book.id !== bookId));
      if (selectedBook?.id === bookId) {
        setSelectedBook(null);
      }
    }
  };

  const openBook = async (book: RecipeBook) => {
    // Load the book with mock recipes for now - in a real app this would load from database
    const recipesWithBookItems = savedRecipes.slice(0, 3).map(recipe => ({
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

    setSelectedBook(bookWithRecipes);
  };

  const addRecipesToBook = async (book: RecipeBook) => {
    // Show recipe selection modal for adding recipes (keep current book selected)
    setShowRecipeSelector(true);
    setBookToEdit(book);
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
    return bookWithRecipes;
  };

  const handleRecipeSelection = (selectedIds: string[]) => {
    if (bookToEdit && selectedBook) {
      // Get the selected recipes to add
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
      setShowRecipeSelector(false);
      setBookToEdit(null);
    }
  };

  const CreateBookModal = () => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [template, setTemplate] = useState<'minimalist' | 'elegant' | 'family' | 'professional'>(
      'minimalist'
    );

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PDF Template</label>
              <div className="grid grid-cols-2 gap-2">
                {PDF_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setTemplate(tmpl.id as any)}
                    disabled={tmpl.isPremium && !isPremium}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      template === tmpl.id
                        ? 'border-pantry-500 bg-pantry-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${tmpl.isPremium && !isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium text-sm">{tmpl.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{tmpl.description}</div>
                    {tmpl.isPremium && !isPremium && (
                      <div className="text-xs text-amber-600 mt-1">💎 Premium</div>
                    )}
                  </button>
                ))}
              </div>
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
              onClick={() => createRecipeBook({ name, description, template })}
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
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
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
    </div>
  );
}
