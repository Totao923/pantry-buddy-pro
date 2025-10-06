import React, { useState } from 'react';
import { RecipeBookWithRecipes, PDFTemplate } from '../types';
import { cookingSessionService, CookingSession } from '../lib/services/cookingSessionService';
import jsPDF from 'jspdf';

interface RecipeBookPDFExporterProps {
  recipeBook: RecipeBookWithRecipes;
  onClose: () => void;
  isPremiumUser?: boolean;
}

export function RecipeBookPDFExporter({
  recipeBook,
  onClose,
  isPremiumUser = false,
}: RecipeBookPDFExporterProps) {
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeTips, setIncludeTips] = useState(true);
  const [includeCookingPhotos, setIncludeCookingPhotos] = useState(true);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper function to load image as base64 for jsPDF
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataURL);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  };

  // Premium template styling configurations
  const getTemplateConfig = (template: string) => {
    switch (template) {
      case 'minimalist':
        return {
          name: 'Modern Minimalist',
          primaryColor: [0, 0, 0],
          secondaryColor: [100, 100, 100],
          accentColor: [240, 240, 240], // Light gray for boxes
          titleFont: 'helvetica',
          bodyFont: 'helvetica',
          titleSize: 28,
          subtitleSize: 14,
          bodySize: 10,
          margin: 30,
          cardStyle: true,
          useIcons: true,
          geometricElements: true,
        };
      case 'elegant':
        return {
          name: 'Classic Elegance',
          primaryColor: [101, 67, 33], // Rich brown
          secondaryColor: [139, 115, 85], // Lighter brown
          accentColor: [245, 240, 235], // Cream
          titleFont: 'times',
          bodyFont: 'times',
          titleSize: 32,
          subtitleSize: 18,
          bodySize: 12,
          margin: 35,
          ornateDecorations: true,
          fancyBorders: true,
          decorativeFrames: true,
        };
      case 'family':
        return {
          name: 'Family Kitchen',
          primaryColor: [139, 69, 19], // Saddle brown
          secondaryColor: [160, 82, 45], // Saddle brown lighter
          accentColor: [255, 248, 220], // Cornsilk
          titleFont: 'helvetica',
          bodyFont: 'helvetica',
          titleSize: 26,
          subtitleSize: 16,
          bodySize: 11,
          margin: 25,
          handwrittenStyle: true,
          familyElements: true,
          personalTouches: true,
        };
      case 'professional':
        return {
          name: "Chef's Collection",
          primaryColor: [47, 79, 79], // Dark slate gray
          secondaryColor: [70, 130, 180], // Steel blue
          accentColor: [248, 248, 255], // Ghost white
          titleFont: 'helvetica',
          bodyFont: 'helvetica',
          titleSize: 24,
          subtitleSize: 14,
          bodySize: 9,
          margin: 20,
          tableFormat: true,
          chefStyle: true,
          structuredLayout: true,
        };
      default:
        return {
          name: 'Basic',
          primaryColor: [0, 0, 0],
          secondaryColor: [128, 128, 128],
          accentColor: [245, 245, 245],
          titleFont: 'helvetica',
          bodyFont: 'helvetica',
          titleSize: 24,
          subtitleSize: 14,
          bodySize: 10,
          margin: 20,
        };
    }
  };

  // Helper functions for premium template features
  const drawCard = (pdf: any, x: number, y: number, width: number, height: number, config: any) => {
    // Draw card background
    pdf.setFillColor(config.accentColor[0], config.accentColor[1], config.accentColor[2]);
    pdf.rect(x, y, width, height, 'F');

    // Draw border
    pdf.setDrawColor(config.secondaryColor[0], config.secondaryColor[1], config.secondaryColor[2]);
    pdf.setLineWidth(0.3);
    pdf.rect(x, y, width, height, 'S');
  };

  const drawOrnateBorder = (
    pdf: any,
    x: number,
    y: number,
    width: number,
    height: number,
    config: any
  ) => {
    pdf.setDrawColor(config.primaryColor[0], config.primaryColor[1], config.primaryColor[2]);
    pdf.setLineWidth(1.2);

    // Outer border
    pdf.rect(x, y, width, height, 'S');

    // Inner decorative border
    pdf.setLineWidth(0.3);
    pdf.rect(x + 2, y + 2, width - 4, height - 4, 'S');

    // Corner decorations
    const cornerSize = 5;
    pdf.setLineWidth(0.8);
    // Top-left corner
    pdf.line(x, y + cornerSize, x + cornerSize, y + cornerSize);
    pdf.line(x + cornerSize, y, x + cornerSize, y + cornerSize);
    // Top-right corner
    pdf.line(x + width, y + cornerSize, x + width - cornerSize, y + cornerSize);
    pdf.line(x + width - cornerSize, y, x + width - cornerSize, y + cornerSize);
    // Bottom-left corner
    pdf.line(x, y + height - cornerSize, x + cornerSize, y + height - cornerSize);
    pdf.line(x + cornerSize, y + height, x + cornerSize, y + height - cornerSize);
    // Bottom-right corner
    pdf.line(x + width, y + height - cornerSize, x + width - cornerSize, y + height - cornerSize);
    pdf.line(x + width - cornerSize, y + height, x + width - cornerSize, y + height - cornerSize);
  };

  const drawFamilyDecoration = (pdf: any, x: number, y: number, config: any) => {
    pdf.setTextColor(config.primaryColor[0], config.primaryColor[1], config.primaryColor[2]);
    pdf.setFontSize(14);

    // Family-style decorative elements
    const decorations = ['♥', '★', '✿', '❀'];
    const decoration = decorations[Math.floor(Math.random() * decorations.length)];
    pdf.text(decoration, x, y, { align: 'center' });
  };

  const drawChefTable = (
    pdf: any,
    headers: string[],
    data: string[][],
    x: number,
    y: number,
    config: any
  ) => {
    const colWidth = 35;
    const rowHeight = 8;
    let currentY = y;

    // Draw table header
    pdf.setFillColor(config.accentColor[0], config.accentColor[1], config.accentColor[2]);
    pdf.rect(x, currentY, colWidth * headers.length, rowHeight, 'F');

    pdf.setDrawColor(config.primaryColor[0], config.primaryColor[1], config.primaryColor[2]);
    pdf.setLineWidth(0.5);
    pdf.rect(x, currentY, colWidth * headers.length, rowHeight, 'S');

    // Header text
    pdf.setTextColor(config.primaryColor[0], config.primaryColor[1], config.primaryColor[2]);
    pdf.setFontSize(config.bodySize);
    pdf.setFont(config.titleFont, 'bold');

    headers.forEach((header, i) => {
      pdf.text(header, x + i * colWidth + 2, currentY + 5);
    });

    currentY += rowHeight;

    // Draw data rows
    pdf.setFont(config.bodyFont, 'normal');
    data.forEach(row => {
      pdf.rect(x, currentY, colWidth * headers.length, rowHeight, 'S');
      row.forEach((cell, i) => {
        pdf.text(cell, x + i * colWidth + 2, currentY + 5);
      });
      currentY += rowHeight;
    });

    return currentY;
  };

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      // Load cooking session data and images for each recipe if photos are enabled
      let cookingSessionsMap = new Map<string, CookingSession>();
      let imageDataMap = new Map<string, string>();
      if (includeCookingPhotos) {
        try {
          const allSessions = await cookingSessionService.getUserCookingSessions(200);
          allSessions.forEach(session => {
            // Store the most recent session for each recipe
            if (
              !cookingSessionsMap.has(session.recipe_id) ||
              new Date(session.cooked_at) >
                new Date(cookingSessionsMap.get(session.recipe_id)!.cooked_at)
            ) {
              cookingSessionsMap.set(session.recipe_id, session);
            }
          });

          // Pre-load all images for recipes that have photos
          const imageLoadPromises = Array.from(cookingSessionsMap.values())
            .filter(session => session.photo_url)
            .map(async session => {
              try {
                const imageData = await loadImageAsBase64(session.photo_url!);
                imageDataMap.set(session.recipe_id, imageData);
              } catch (error) {
                console.warn('Failed to load image for recipe:', session.recipe_id, error);
              }
            });

          await Promise.all(imageLoadPromises);
        } catch (error) {
          console.warn('Failed to load cooking sessions for photos:', error);
        }
      }
      const pdf = new jsPDF('p', 'mm', pageSize === 'A4' ? 'a4' : 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const templateConfig = getTemplateConfig('elegant');
      const margin = templateConfig.margin;
      const contentWidth = pageWidth - 2 * margin;

      let currentY = margin;

      // Elegant cover page
      {
        // Elegant cover with recipe book styling
        currentY = pageHeight / 2 - 40;

        // Main title with recipe book styling (like table of contents)
        pdf.setTextColor(139, 69, 19); // Warm brown color
        pdf.setFontSize(28);
        pdf.setFont('times', 'bold');
        // Capitalize first letter of each word
        const titleCase = recipeBook.name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        pdf.text(titleCase, pageWidth / 2, currentY, { align: 'center' });

        currentY += 15;

        // Decorative line under title
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(139, 69, 19);
        const lineWidth = 100;
        pdf.line(pageWidth / 2 - lineWidth / 2, currentY, pageWidth / 2 + lineWidth / 2, currentY);

        currentY += 15;

        // Subtitle with elegant styling
        if (recipeBook.description) {
          pdf.setTextColor(80, 80, 80);
          pdf.setFontSize(14);
          pdf.setFont('times', 'italic');
          pdf.text(recipeBook.description, pageWidth / 2, currentY, { align: 'center' });
          currentY += 20;
        }

        // Decorative element
        pdf.setTextColor(139, 69, 19);
        pdf.setFontSize(18);
        pdf.text('~ Recipe Collection ~', pageWidth / 2, currentY, { align: 'center' });

        // Date with elegant styling
        currentY = pageHeight - 50;
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(12);
        pdf.setFont('times', 'normal');
        pdf.text(`Created with Pantry Buddy Pro`, pageWidth / 2, currentY, {
          align: 'center',
        });
        pdf.text(`${new Date().toLocaleDateString()}`, pageWidth / 2, currentY + 10, {
          align: 'center',
        });
      }

      // Table of Contents with recipe book styling
      pdf.addPage();
      currentY = margin + 20;

      // Table of Contents title with recipe book styling
      pdf.setTextColor(139, 69, 19); // Warm brown color
      pdf.setFontSize(24);
      pdf.setFont('times', 'bold');
      pdf.text('Table of Contents', margin, currentY);
      currentY += 25;

      // Decorative line under title
      pdf.setLineWidth(0.5);
      pdf.setDrawColor(139, 69, 19);
      pdf.line(margin, currentY - 5, margin + 100, currentY - 5);
      currentY += 10;

      // Recipe list with elegant styling
      pdf.setFontSize(12);
      pdf.setFont('times', 'normal');
      pdf.setTextColor(60, 60, 60);

      recipeBook.recipes.forEach((recipe, index) => {
        pdf.text(`${index + 1}. ${recipe.title}`, margin + 10, currentY);
        currentY += 8;
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin + 20;
        }
      });

      // Recipes with simplified, reliable layout
      recipeBook.recipes.forEach((recipe, recipeIndex) => {
        pdf.addPage();
        currentY = margin + 10;

        // No border for recipe card - clean layout

        currentY += 10;

        // Recipe title - recipe book styling
        pdf.setTextColor(139, 69, 19); // Warm brown color
        pdf.setFontSize(22);
        pdf.setFont('times', 'bold');
        pdf.text(recipe.title, margin + 15, currentY);
        currentY += 25;

        // Recipe info in one line - more compact
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(80, 80, 80);
        pdf.text(
          `Servings: ${recipe.servings}   •   Prep: ${recipe.prepTime} min   •   Cook: ${recipe.cookTime} min`,
          margin + 15,
          currentY
        );
        currentY += 15;

        // Description - more compact
        if (recipe.description) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(100, 100, 100);
          const descLines = pdf.splitTextToSize(recipe.description, contentWidth - 30);
          pdf.text(descLines, margin + 15, currentY);
          currentY += descLines.length * 4 + 10;
        }

        // Two-column layout for ingredients and photo
        pdf.setTextColor(0, 0, 0);

        const ingredientsStartY = currentY;
        const hasPhoto =
          includeCookingPhotos && cookingSessionsMap.has(recipe.id) && imageDataMap.has(recipe.id);

        // Calculate column widths
        const leftColumnWidth = hasPhoto ? contentWidth * 0.6 : contentWidth - 30;
        const rightColumnWidth = contentWidth * 0.35;
        const rightColumnX = margin + leftColumnWidth + 20;

        // INGREDIENTS SECTION (Left column) - Recipe book style
        pdf.setFontSize(16);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(139, 69, 19); // Warm brown color
        pdf.text('Ingredients', margin + 15, currentY);
        currentY += 12;

        pdf.setFontSize(10);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(60, 60, 60);
        recipe.ingredients.forEach(ingredient => {
          const ingText = `• ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`;
          const lines = pdf.splitTextToSize(ingText, leftColumnWidth - 20);
          pdf.text(lines, margin + 20, currentY);
          currentY += lines.length * 5 + 2;
        });

        // PHOTO SECTION (Right column, alongside ingredients) - MUCH LARGER
        if (hasPhoto) {
          const imageData = imageDataMap.get(recipe.id)!;
          const photoY = ingredientsStartY + 5; // Bring up a bit higher

          // Calculate photo dimensions - much larger
          const photoWidth = Math.min(rightColumnWidth, 110); // Even larger photo
          const photoHeight = (photoWidth * 3) / 4;

          // Add much larger photo
          pdf.addImage(imageData, 'JPEG', rightColumnX, photoY, photoWidth, photoHeight);
        }

        currentY += 10;

        // DIRECTIONS SECTION - Recipe book style
        pdf.setFontSize(16);
        pdf.setFont('times', 'bold');
        pdf.setTextColor(139, 69, 19); // Warm brown color
        pdf.text('Directions', margin + 15, currentY);
        currentY += 12;

        pdf.setFontSize(10);
        pdf.setFont('times', 'normal');
        pdf.setTextColor(60, 60, 60);
        recipe.instructions.forEach(instruction => {
          const stepText = `${instruction.step}. ${instruction.instruction}`;
          const lines = pdf.splitTextToSize(stepText, contentWidth - 30);
          pdf.text(lines, margin + 20, currentY);
          currentY += lines.length * 5 + 6;
        });

        // Personal notes - recipe book style
        if (includeNotes && recipe.bookItem?.personalNotes) {
          currentY += 10;

          pdf.setFontSize(14);
          pdf.setFont('times', 'bold');
          pdf.setTextColor(139, 69, 19); // Warm brown color
          pdf.text('Notes', margin + 15, currentY);
          currentY += 10;

          pdf.setFontSize(9);
          pdf.setFont('times', 'italic');
          pdf.setTextColor(80, 80, 80);
          const notesLines = pdf.splitTextToSize(recipe.bookItem.personalNotes, contentWidth - 30);
          pdf.text(notesLines, margin + 15, currentY);
          currentY += notesLines.length * 4;
        }

        // Nutrition info - recipe book style
        if (includeNutrition && recipe.nutritionInfo) {
          currentY += 12;

          pdf.setFontSize(14);
          pdf.setFont('times', 'bold');
          pdf.setTextColor(139, 69, 19); // Warm brown color
          pdf.text('Nutrition (per serving)', margin + 15, currentY);
          currentY += 10;

          pdf.setFontSize(9);
          pdf.setFont('times', 'normal');
          pdf.setTextColor(80, 80, 80);
          const nutrition = recipe.nutritionInfo;
          pdf.text(
            `Calories: ${nutrition.calories}   Protein: ${nutrition.protein}g   Carbs: ${nutrition.carbs}g   Fat: ${nutrition.fat}g`,
            margin + 15,
            currentY
          );
        }
      });

      // Save the PDF
      const fileName = `${recipeBook.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-recipe-book.pdf`;
      pdf.save(fileName);

      onClose();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Export Recipe Book</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* Content Options */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Include in PDF</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={e => setIncludeNotes(e.target.checked)}
                    className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">Personal notes</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeNutrition}
                    onChange={e => setIncludeNutrition(e.target.checked)}
                    className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">Nutrition information</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeTips}
                    onChange={e => setIncludeTips(e.target.checked)}
                    className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">Cooking tips</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={includeCookingPhotos}
                    onChange={e => setIncludeCookingPhotos(e.target.checked)}
                    className="rounded border-gray-300 text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">📷 Your cooking photos</span>
                </label>
              </div>
            </div>

            {/* Page Settings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Page Settings</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pageSize"
                    value="A4"
                    checked={pageSize === 'A4'}
                    onChange={e => setPageSize(e.target.value as 'A4')}
                    className="text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">A4</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="radio"
                    name="pageSize"
                    value="Letter"
                    checked={pageSize === 'Letter'}
                    onChange={e => setPageSize(e.target.value as 'Letter')}
                    className="text-pantry-600 focus:ring-pantry-500"
                  />
                  <span className="ml-2 text-gray-700">Letter</span>
                </label>
              </div>
            </div>

            {/* Preview Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">PDF Preview</h3>
              <div className="text-sm text-gray-600 space-y-1">
                <div>📚 Book: {recipeBook.name}</div>
                <div>🍽️ Recipes: {recipeBook.recipes.length}</div>
                <div>📏 Page Size: {pageSize}</div>
                <div>📝 Estimated Pages: {Math.ceil(recipeBook.recipes.length * 2.5)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="px-6 py-2 bg-pantry-600 text-white rounded-lg hover:bg-pantry-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating PDF...
                </>
              ) : (
                <>📄 Generate PDF</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
