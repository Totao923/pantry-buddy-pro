import React, { useState } from 'react';
import { RecipeBookWithRecipes, PDFTemplate } from '../types';
import jsPDF from 'jspdf';

interface RecipeBookPDFExporterProps {
  recipeBook: RecipeBookWithRecipes;
  onClose: () => void;
  isPremiumUser?: boolean;
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

export function RecipeBookPDFExporter({
  recipeBook,
  onClose,
  isPremiumUser = false,
}: RecipeBookPDFExporterProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(recipeBook.template);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [includeNutrition, setIncludeNutrition] = useState(true);
  const [includeTips, setIncludeTips] = useState(true);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [isGenerating, setIsGenerating] = useState(false);

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
      const pdf = new jsPDF('p', 'mm', pageSize === 'A4' ? 'a4' : 'letter');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const templateConfig = getTemplateConfig(selectedTemplate);
      const margin = templateConfig.margin;
      const contentWidth = pageWidth - 2 * margin;

      let currentY = margin;

      // Premium template-specific cover page designs
      if (selectedTemplate === 'minimalist') {
        // Modern minimalist cover with geometric elements
        currentY = pageHeight / 3;

        // Clean geometric frame
        pdf.setDrawColor(
          templateConfig.secondaryColor[0],
          templateConfig.secondaryColor[1],
          templateConfig.secondaryColor[2]
        );
        pdf.setLineWidth(2);
        pdf.rect(margin, currentY - 20, contentWidth, 80, 'S');

        // Title with extra space
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.titleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(recipeBook.name.toUpperCase(), pageWidth / 2, currentY + 10, { align: 'center' });

        // Minimal description
        if (recipeBook.description) {
          pdf.setFontSize(templateConfig.bodySize + 2);
          pdf.setFont(templateConfig.bodyFont, 'normal');
          pdf.setTextColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          pdf.text(recipeBook.description, pageWidth / 2, currentY + 35, { align: 'center' });
        }

        // Clean bottom info
        currentY = pageHeight - 40;
        pdf.setFontSize(templateConfig.bodySize);
        pdf.setTextColor(
          templateConfig.secondaryColor[0],
          templateConfig.secondaryColor[1],
          templateConfig.secondaryColor[2]
        );
        pdf.text(`${templateConfig.name} • Pantry Buddy Pro`, pageWidth / 2, currentY, {
          align: 'center',
        });
        pdf.text(`${new Date().toLocaleDateString()}`, pageWidth / 2, currentY + 8, {
          align: 'center',
        });
      } else if (selectedTemplate === 'elegant') {
        // Ornate elegant cover with decorative borders
        currentY = 40;

        // Ornate border around entire cover
        drawOrnateBorder(
          pdf,
          margin - 5,
          currentY - 10,
          contentWidth + 10,
          pageHeight - 80,
          templateConfig
        );

        currentY = pageHeight / 2 - 40;

        // Decorative title frame
        const titleFrameWidth = contentWidth - 40;
        const titleFrameHeight = 60;
        const titleFrameX = pageWidth / 2 - titleFrameWidth / 2;

        drawOrnateBorder(
          pdf,
          titleFrameX,
          currentY,
          titleFrameWidth,
          titleFrameHeight,
          templateConfig
        );

        // Elegant title
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.titleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(recipeBook.name, pageWidth / 2, currentY + 25, { align: 'center' });

        // Decorative flourishes
        pdf.setFontSize(20);
        pdf.text('❦', pageWidth / 2, currentY + 40, { align: 'center' });

        currentY += 80;

        // Elegant description
        if (recipeBook.description) {
          pdf.setFontSize(templateConfig.subtitleSize);
          pdf.setFont(templateConfig.bodyFont, 'italic');
          pdf.setTextColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          pdf.text(recipeBook.description, pageWidth / 2, currentY + 20, { align: 'center' });
        }

        // Elegant footer
        currentY = pageHeight - 50;
        pdf.setFontSize(templateConfig.bodySize + 1);
        pdf.setFont(templateConfig.titleFont, 'normal');
        pdf.text(`${templateConfig.name}`, pageWidth / 2, currentY, { align: 'center' });
        pdf.text(`Created with Pantry Buddy Pro`, pageWidth / 2, currentY + 10, {
          align: 'center',
        });
        pdf.text(`${new Date().toLocaleDateString()}`, pageWidth / 2, currentY + 20, {
          align: 'center',
        });
      } else if (selectedTemplate === 'family') {
        // Warm family-style cover
        currentY = 50;

        // Family-style card background
        drawCard(pdf, margin - 5, currentY, contentWidth + 10, pageHeight - 100, templateConfig);

        currentY = pageHeight / 2 - 30;

        // Family title with decorations
        drawFamilyDecoration(pdf, pageWidth / 2 - 40, currentY, templateConfig);
        drawFamilyDecoration(pdf, pageWidth / 2 + 40, currentY, templateConfig);

        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.titleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(recipeBook.name, pageWidth / 2, currentY + 15, { align: 'center' });

        // Personal touch
        pdf.setFontSize(templateConfig.subtitleSize);
        pdf.setFont(templateConfig.bodyFont, 'italic');
        pdf.text('~ A Collection of Family Favorites ~', pageWidth / 2, currentY + 35, {
          align: 'center',
        });

        if (recipeBook.description) {
          pdf.setFontSize(templateConfig.bodySize + 1);
          pdf.setFont(templateConfig.bodyFont, 'normal');
          pdf.setTextColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          pdf.text(recipeBook.description, pageWidth / 2, currentY + 50, { align: 'center' });
        }

        // Warm footer
        currentY = pageHeight - 40;
        pdf.setFontSize(templateConfig.bodySize);
        pdf.text(`Made with ♥ using Pantry Buddy Pro`, pageWidth / 2, currentY, {
          align: 'center',
        });
        pdf.text(`${new Date().toLocaleDateString()}`, pageWidth / 2, currentY + 10, {
          align: 'center',
        });
      } else if (selectedTemplate === 'professional') {
        // Chef-style professional cover
        currentY = 30;

        // Professional header bar
        pdf.setFillColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.rect(0, 0, pageWidth, 25, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(14);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text('PROFESSIONAL RECIPE COLLECTION', pageWidth / 2, 15, { align: 'center' });

        currentY = pageHeight / 2 - 20;

        // Clean professional title
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.titleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(recipeBook.name, pageWidth / 2, currentY, { align: 'center' });

        // Professional divider
        pdf.setDrawColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setLineWidth(1);
        pdf.line(margin, currentY + 10, pageWidth - margin, currentY + 10);

        if (recipeBook.description) {
          pdf.setFontSize(templateConfig.subtitleSize);
          pdf.setFont(templateConfig.bodyFont, 'normal');
          pdf.setTextColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          pdf.text(recipeBook.description, pageWidth / 2, currentY + 25, { align: 'center' });
        }

        // Professional info box
        currentY = pageHeight - 70;
        drawCard(pdf, margin, currentY, contentWidth, 40, templateConfig);

        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.bodySize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(`Template: ${templateConfig.name}`, margin + 10, currentY + 15);
        pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 10, currentY + 25);
        pdf.text(`Recipes: ${recipeBook.recipes.length}`, margin + 10, currentY + 35);
      } else {
        // Default basic cover
        currentY = pageHeight / 2;
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.titleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(recipeBook.name, pageWidth / 2, currentY, { align: 'center' });

        if (recipeBook.description) {
          pdf.setFontSize(templateConfig.subtitleSize);
          pdf.text(recipeBook.description, pageWidth / 2, currentY + 20, { align: 'center' });
        }
      }

      // Table of Contents with template styling
      pdf.addPage();
      currentY = margin;

      pdf.setTextColor(
        templateConfig.primaryColor[0],
        templateConfig.primaryColor[1],
        templateConfig.primaryColor[2]
      );
      pdf.setFontSize(templateConfig.subtitleSize + 4);
      pdf.setFont(templateConfig.titleFont, 'bold');
      pdf.text('Table of Contents', margin, currentY);
      currentY += selectedTemplate === 'elegant' ? 20 : 15;

      // Add decorative line under title for certain templates
      if (selectedTemplate === 'elegant') {
        pdf.setLineWidth(0.3);
        pdf.setDrawColor(
          templateConfig.secondaryColor[0],
          templateConfig.secondaryColor[1],
          templateConfig.secondaryColor[2]
        );
        pdf.line(margin, currentY - 5, margin + 80, currentY - 5);
        currentY += 5;
      }

      pdf.setFontSize(templateConfig.bodySize + 1);
      pdf.setFont(templateConfig.bodyFont, 'normal');
      pdf.setTextColor(
        templateConfig.primaryColor[0],
        templateConfig.primaryColor[1],
        templateConfig.primaryColor[2]
      );

      recipeBook.recipes.forEach((recipe, index) => {
        const spacing =
          selectedTemplate === 'professional' ? 6 : selectedTemplate === 'elegant' ? 8 : 7;
        pdf.text(`${index + 1}. ${recipe.title}`, margin + 5, currentY);
        currentY += spacing;
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
      });

      // Recipes
      recipeBook.recipes.forEach((recipe, recipeIndex) => {
        pdf.addPage();
        currentY = margin;

        // Recipe title with template styling
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.setFontSize(templateConfig.subtitleSize + 2);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.text(`${recipeIndex + 1}. ${recipe.title}`, margin, currentY);
        currentY += selectedTemplate === 'elegant' ? 15 : 10;

        // Add decorative elements for recipe titles
        if (selectedTemplate === 'elegant') {
          pdf.setLineWidth(0.2);
          pdf.setDrawColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          pdf.line(margin, currentY - 2, pageWidth - margin, currentY - 2);
          currentY += 5;
        }

        // Recipe description with template styling
        if (recipe.description) {
          pdf.setFontSize(templateConfig.bodySize);
          pdf.setFont(templateConfig.bodyFont, 'italic');
          pdf.setTextColor(
            templateConfig.secondaryColor[0],
            templateConfig.secondaryColor[1],
            templateConfig.secondaryColor[2]
          );
          const descLines = pdf.splitTextToSize(recipe.description, contentWidth);
          pdf.text(descLines, margin, currentY);
          currentY += descLines.length * 5 + (selectedTemplate === 'elegant' ? 12 : 8);
        }

        // Recipe info with template styling
        pdf.setFontSize(templateConfig.bodySize);
        pdf.setFont(templateConfig.bodyFont, 'normal');
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );

        // Template-specific layout for recipe info
        if (selectedTemplate === 'professional') {
          // More compact, business-like layout
          pdf.text(
            `Servings: ${recipe.servings} | Prep: ${recipe.prepTime} min | Cook: ${recipe.cookTime} min | Total: ${recipe.totalTime} min`,
            margin,
            currentY
          );
          currentY += 10;
        } else {
          // Standard layout with spacing
          pdf.text(`Servings: ${recipe.servings}`, margin, currentY);
          pdf.text(`Prep: ${recipe.prepTime} min`, margin + 50, currentY);
          pdf.text(`Cook: ${recipe.cookTime} min`, margin + 100, currentY);
          pdf.text(`Total: ${recipe.totalTime} min`, margin + 150, currentY);
          currentY += 12;
        }

        // Ingredients section with template styling
        pdf.setFontSize(templateConfig.subtitleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.text('Ingredients', margin, currentY);
        currentY += selectedTemplate === 'elegant' ? 12 : 8;

        pdf.setFontSize(templateConfig.bodySize);
        pdf.setFont(templateConfig.bodyFont, 'normal');
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
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

        currentY += selectedTemplate === 'elegant' ? 12 : 8;

        // Instructions section with template styling
        pdf.setFontSize(templateConfig.subtitleSize);
        pdf.setFont(templateConfig.titleFont, 'bold');
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );
        pdf.text('Instructions', margin, currentY);
        currentY += selectedTemplate === 'elegant' ? 12 : 8;

        pdf.setFontSize(templateConfig.bodySize);
        pdf.setFont(templateConfig.bodyFont, 'normal');
        pdf.setTextColor(
          templateConfig.primaryColor[0],
          templateConfig.primaryColor[1],
          templateConfig.primaryColor[2]
        );

        recipe.instructions.forEach(instruction => {
          const stepSpacing =
            selectedTemplate === 'professional' ? 4 : selectedTemplate === 'elegant' ? 6 : 5;
          const instText =
            selectedTemplate === 'elegant'
              ? `${instruction.step}. ${instruction.instruction}`
              : `${instruction.step}. ${instruction.instruction}`;
          const instLines = pdf.splitTextToSize(instText, contentWidth);
          pdf.text(instLines, margin, currentY);
          currentY += instLines.length * stepSpacing + (selectedTemplate === 'elegant' ? 8 : 5);

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
                    disabled={template.isPremium && !isPremiumUser}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      selectedTemplate === template.id
                        ? 'border-pantry-500 bg-pantry-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${template.isPremium && !isPremiumUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="font-medium">{template.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{template.description}</div>
                    {template.isPremium && (
                      <div className="text-xs text-amber-600 mt-2">
                        💎 Premium Template {isPremiumUser ? '✓ Available' : '(Upgrade to access)'}
                      </div>
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
