import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Phone,
  Mail,
  Calendar,
  Clock,
  MoreVertical,
  DollarSign,
  AlertCircle,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { PipelineCotacao, StatusPipelineCotacao } from "../../types";
import {
  COLOR_MAP,
  DEFAULT_COLUMNS,
  PipelineColumn,
} from "../../constants/kanban";

// Helper para mapear cores

// Helper para mapear cores
const getColorConfig = (colorName: string) => {
  return COLOR_MAP[colorName] || COLOR_MAP["slate"];
};

interface KanbanCardProps {
  item: PipelineCotacao;
  columns?: PipelineColumn[];
  onClick?: () => void;
  onStatusChange?: (newStatus: StatusPipelineCotacao) => void;
  onScheduleFollowUp?: () => void;
  onCall?: () => void;
  isOverlay?: boolean;
}

function KanbanCardContent({
  item,
  columns = DEFAULT_COLUMNS,
  onClick,
  onStatusChange,
  onScheduleFollowUp,
  onCall,
  isOverlay = false,
}: KanbanCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);

  const isStalled = item.diasParado > 3;
  const isUrgent =
    item.proximoContato && new Date(item.proximoContato) <= new Date();

  return (
    <div
      className={`
        bg-white rounded-xl border p-3 cursor-grab transition-all relative
        ${
          isOverlay
            ? "shadow-2xl scale-105 rotate-2 cursor-grabbing z-50 ring-2 ring-violet-500"
            : "hover:shadow-lg hover:border-violet-200"
        }
        ${isUrgent ? "ring-2 ring-amber-300" : ""}
        ${isStalled ? "border-red-200" : "border-slate-200"}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-800 truncate">
            {item.cliente}
          </h4>
          <p className="text-xs text-slate-500 truncate">
            {item.modelo || item.ramo?.toUpperCase()}
          </p>
        </div>
        <div className="relative">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-slate-400" />
          </button>

          {/* Menu dropdown */}
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                {onScheduleFollowUp && (
                  <button
                    onClick={() => {
                      onScheduleFollowUp();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Agendar Follow-up
                  </button>
                )}
                {onCall && (
                  <button
                    onClick={() => {
                      onCall();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Ligar para Cliente
                  </button>
                )}
                <div className="border-t border-slate-100 my-1" />
                <div className="px-3 py-1 text-xs text-slate-400 uppercase">
                  Mover para
                </div>
                {onStatusChange &&
                  columns
                    .filter(
                      (col) =>
                        !["fechada_ganha", "fechada_perdida"].includes(col.key)
                    )
                    .map((col) => (
                      <button
                        key={col.key}
                        onClick={() => {
                          onStatusChange(col.key as StatusPipelineCotacao);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        {col.label}
                      </button>
                    ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Valor */}
      {item.valor && (
        <div className="flex items-center gap-1 mb-2">
          <DollarSign className="w-3 h-3 text-emerald-500" />
          <span className="text-sm font-medium text-slate-700">
            {formatCurrency(item.valor)}
          </span>
        </div>
      )}

      {/* Indicadores */}
      <div className="flex items-center gap-2 flex-wrap">
        {isStalled && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
            <AlertCircle className="w-3 h-3" />
            {item.diasParado}d parado
          </span>
        )}
        {isUrgent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-medium animate-pulse">
            <Clock className="w-3 h-3" />
            Follow-up hoje
          </span>
        )}
        {item.proximoContato && !isUrgent && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px]">
            <Calendar className="w-3 h-3" />
            {new Date(item.proximoContato).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-slate-100">
        {item.telefone && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (item.telefone) window.open(`tel:${item.telefone}`);
            }}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
            title="Ligar"
          >
            <Phone className="w-3.5 h-3.5" />
          </button>
        )}
        {item.email && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (item.email) window.open(`mailto:${item.email}`);
            }}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title="Email"
          >
            <Mail className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            if (item.telefone) {
              const phone = item.telefone.replace(/\D/g, "");
              window.open(`https://wa.me/55${phone}`, "_blank");
            }
          }}
          className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
          title="WhatsApp"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1" />
        <span className="text-[10px] text-slate-400">
          {new Date(item.dataCriacao).toLocaleDateString("pt-BR")}
        </span>
      </div>
    </div>
  );
}

function KanbanCard(props: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: props.item.id,
      data: { item: props.item },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30">
        <KanbanCardContent {...props} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <KanbanCardContent {...props} />
    </div>
  );
}

interface KanbanColumnProps {
  column: PipelineColumn;
  items: PipelineCotacao[];
  onCardClick: (item: PipelineCotacao) => void;
  onStatusChange: (itemId: string, newStatus: StatusPipelineCotacao) => void;
  onScheduleFollowUp: (item: PipelineCotacao) => void;
  showClosedColumns?: boolean;
}

function KanbanColumn({
  column,
  items,
  onCardClick,
  onStatusChange,
  onScheduleFollowUp,
  showClosedColumns = true,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.key,
  });

  const isClosed = ["fechada_ganha", "fechada_perdida"].includes(column.key);
  const colorConfig = getColorConfig(column.color);

  if (isClosed && !showClosedColumns) return null;

  const totalValue = items.reduce((acc, item) => acc + (item.valor || 0), 0);

  return (
    <div className={`shrink-0 w-72 ${isClosed ? "w-56" : ""}`}>
      {/* Column Header */}
      <div
        className={`p-3 rounded-t-xl ${colorConfig.bgColor} border-b-2 ${colorConfig.borderColor}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-semibold ${colorConfig.color}`}>
              {column.label}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorConfig.bgColor} ${colorConfig.color}`}
            >
              {items.length}
            </span>
          </div>
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-slate-500 mt-1">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
            }).format(totalValue)}
          </p>
        )}
      </div>

      {/* Cards container */}
      <div
        ref={setNodeRef}
        className="bg-slate-50/50 rounded-b-xl p-2 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto space-y-2"
      >
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onClick={() => onCardClick(item)}
              onStatusChange={(newStatus) => onStatusChange(item.id, newStatus)}
              onScheduleFollowUp={() => onScheduleFollowUp(item)}
              onCall={() =>
                item.telefone && window.open(`tel:${item.telefone}`)
              }
            />
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <p className="text-sm">Arraste aqui</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  pipeline: Record<string, PipelineCotacao[]>;
  columns?: PipelineColumn[]; // Se não passar, usa default
  onCardClick: (item: PipelineCotacao) => void;
  onStatusChange: (itemId: string, newStatus: StatusPipelineCotacao) => void;
  onScheduleFollowUp: (item: PipelineCotacao) => void;
  showClosedColumns?: boolean;
}

export function KanbanBoard({
  pipeline,
  columns = DEFAULT_COLUMNS, // Usa default se não passado
  onCardClick,
  onStatusChange,
  onScheduleFollowUp,
  showClosedColumns = false,
}: KanbanBoardProps) {
  const [activeItem, setActiveItem] = useState<PipelineCotacao | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // prevent drag on simple click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current?.item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id && activeItem) {
      // Find current status
      // We need to know which column we dropped into
      const targetColumn = over.id as StatusPipelineCotacao;

      // Find current column of the item
      let currentStatus: string = "nova";
      Object.entries(pipeline).forEach(([status, items]) => {
        if (items.find((i) => i.id === active.id)) {
          currentStatus = status;
        }
      });

      if (targetColumn !== currentStatus) {
        onStatusChange(active.id as string, targetColumn);
      }
    }

    setActiveItem(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            items={pipeline[column.key] || []}
            onCardClick={onCardClick}
            onStatusChange={onStatusChange}
            onScheduleFollowUp={onScheduleFollowUp}
            showClosedColumns={showClosedColumns}
          />
        ))}
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="w-72">
            <KanbanCardContent item={activeItem} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Export column config for use in other components
// Export column config for use in other components
