import React, { useState } from 'react';
import { RecipeBookWithRecipes, PDFTemplate } from '../types';
import jsPDF from 'jspdf';

interface RecipeBookPDFExporterProps {
  recipeBook: RecipeBookWithRecipes;
  onClose: () => void;
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

export function RecipeBookPDFExporter({ recipeBook, onClose }: RecipeBookPDFExporterProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(recipeBook.template);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeTips, setIncludeTips] = useState(true);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', pageSize === 'A4' ? 'a4' : 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      let currentY = margin;

      // Cover page
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(recipeBook.name, pageWidth / 2, currentY, { align: 'center' });
      currentY += 15;

      if (recipeBook.description) {
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(recipeBook.description, contentWidth);
        pdf.text(descLines, pageWidth / 2, currentY, { align: 'center' });
        currentY += descLines.length * 7 + 10;
      }

      pdf.setFontSize(10);
      pdf.text(`Generated with Pantry Buddy Pro`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 7;
      pdf.text(
        `Template: ${PDF_TEMPLATES.find(t => t.id === selectedTemplate)?.name}`,
        pageWidth / 2,
        currentY,
        { align: 'center' }
      );
      currentY += 7;
      pdf.text(`${new Date().toLocaleDateString()}`, pageWidth / 2, currentY, { align: 'center' });

      // Table of Contents
      pdf.addPage();
      currentY = margin;

      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Table of Contents', margin, currentY);
      currentY += 15;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      recipeBook.recipes.forEach((recipe, index) => {
        pdf.text(`${index + 1}. ${recipe.title}`, margin + 5, currentY);
        currentY += 7;
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
      });

      // Recipes
      recipeBook.recipes.forEach((recipe, recipeIndex) => {
        pdf.addPage();
        currentY = margin;

        // Recipe title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${recipeIndex + 1}. ${recipe.title}`, margin, currentY);
        currentY += 10;

        // Recipe description
        if (recipe.description) {
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'italic');
          const descLines = pdf.splitTextToSize(recipe.description, contentWidth);
          pdf.text(descLines, margin, currentY);
          currentY += descLines.length * 5 + 8;
        }

        // Recipe info
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Servings: ${recipe.servings}`, margin, currentY);
        pdf.text(`Prep: ${recipe.prepTime} min`, margin + 50, currentY);
        pdf.text(`Cook: ${recipe.cookTime} min`, margin + 100, currentY);
        pdf.text(`Total: ${recipe.totalTime} min`, margin + 150, currentY);
        currentY += 12;

        // Ingredients
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Ingredients', margin, currentY);
        currentY += 8;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        recipe.ingredients.forEach(ingredient => {
          const ingText = `• ${ingredient.amount} ${ingredient.unit} ${ingredient.name}`;
          const ingLines = pdf.splitTextToSize(ingText, contentWidth);
          pdf.text(ingLines, margin + 5, currentY);
          currentY += ingLines.length * 5 + 2;

          if (currentY > pageHeight - 30) {
            pdf.addPage();
            currentY = margin;
          }
        });

        currentY += 8;

        // Instructions
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Instructions', margin, currentY);
        currentY += 8;

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        recipe.instructions.forEach(instruction => {
          const instText = `${instruction.step}. ${instruction.instruction}`;
          const instLines = pdf.splitTextToSize(instText, contentWidth);
          pdf.text(instLines, margin, currentY);
          currentY += instLines.length * 5 + 5;

          if (currentY > pageHeight - 30) {
            pdf.addPage();
            currentY = margin;
          }
        });

        // Personal notes
        if (includeNotes && recipe.bookItem.personalNotes) {
          currentY += 8;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Personal Notes', margin, currentY);
          currentY += 6;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          const notesLines = pdf.splitTextToSize(recipe.bookItem.personalNotes, contentWidth);
          pdf.text(notesLines, margin, currentY);
          currentY += notesLines.length * 4 + 5;
        }

        // Nutrition info
        if (includeNutrition && recipe.nutritionInfo) {
          currentY += 8;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Nutrition (per serving)', margin, currentY);
          currentY += 6;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const nutrition = recipe.nutritionInfo;
          pdf.text(`Calories: ${nutrition.calories}`, margin, currentY);
          pdf.text(`Protein: ${nutrition.protein}g`, margin + 60, currentY);
          pdf.text(`Carbs: ${nutrition.carbs}g`, margin + 120, currentY);
          currentY += 5;
          pdf.text(`Fat: ${nutrition.fat}g`, margin, currentY);
          if (nutrition.fiber) pdf.text(`Fiber: ${nutrition.fiber}g`, margin + 60, currentY);
          if (nutrition.sodium) pdf.text(`Sodium: ${nutrition.sodium}mg`, margin + 120, currentY);
        }

        // Tips
        if (includeTips && recipe.tips && recipe.tips.length > 0) {
          currentY += 8;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Tips', margin, currentY);
          currentY += 6;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          recipe.tips.forEach(tip => {
            const tipLines = pdf.splitTextToSize(`• ${tip}`, contentWidth);
            pdf.text(tipLines, margin, currentY);
            currentY += tipLines.length * 4 + 3;
          });
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
            {/* Template Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">PDF Template</h3>
              <div className="grid grid-cols-2 gap-4">
                {PDF_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id as any)}
                    disabled={template.isPremium}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-pantry-500 bg-pantry-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${template.isPremium ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                    {template.isPremium && (
                      <div className="text-xs text-amber-600 mt-2">💎 Premium Template</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

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
                <div>📄 Template: {PDF_TEMPLATES.find(t => t.id === selectedTemplate)?.name}</div>
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
