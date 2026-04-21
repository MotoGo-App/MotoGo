'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, X } from 'lucide-react';
import { toast } from 'sonner';

interface RatingModalProps {
  isOpen: boolean;
  rideId: string;
  toUserId: string; // ID del usuario a calificar (conductor o cliente)
  toUserName: string; // Nombre del usuario a calificar
  isClientRating: boolean; // true si el cliente califica al conductor
  userRole: 'CLIENT' | 'DRIVER'; // Rol del usuario que califica
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

export function RatingModal({
  isOpen,
  rideId,
  toUserId,
  toUserName,
  isClientRating,
  userRole,
  onClose,
  onSubmitSuccess,
}: RatingModalProps) {
  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stars === 0) {
      toast.error('Por favor selecciona una calificación');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideId,
          toUserId,
          stars,
          comment: comment.trim(),
          isClientRating,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Error al enviar calificación');
        return;
      }

      toast.success(`¡Gracias por calificar a ${toUserName}!`);
      setStars(0);
      setComment('');
      onSubmitSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al enviar calificación');
    } finally {
      setIsLoading(false);
    }
  };

  const roleText = isClientRating ? 'Conductor' : 'Cliente';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-border animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-display text-foreground">Califica tu viaje</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-secondary rounded-full transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nombre del usuario */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">¿Cómo fue tu experiencia con?</p>
            <p className="text-lg font-semibold text-foreground">{toUserName}</p>
            <p className="text-xs text-muted-foreground mt-1">{roleText}</p>
          </div>

          {/* Rating stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setStars(star)}
                onMouseEnter={() => setHoverStars(star)}
                onMouseLeave={() => setHoverStars(0)}
                className="transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={`w-10 h-10 transition-all ${
                    star <= (hoverStars || stars)
                      ? 'fill-yellow-400 text-yellow-400 scale-110'
                      : 'text-muted-foreground/30'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating feedback text */}
          {stars > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              {stars === 1 && '😞 Muy malo'}
              {stars === 2 && '😐 Malo'}
              {stars === 3 && '😐 Regular'}
              {stars === 4 && '😊 Bueno'}
              {stars === 5 && '😍 Excelente'}
            </div>
          )}

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-muted-foreground mb-2">
              Comentario (opcional)
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Cuéntanos tu experiencia..."
              className="w-full px-3 py-2 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-secondary/50 text-foreground resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">{comment.length}/200</p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <Button
              type="submit"
              disabled={isLoading || stars === 0}
              className="flex-1 h-auto py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                'Enviar calificación'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
