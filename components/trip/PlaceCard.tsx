import { Place, ItineraryItem } from "@/lib/types";
import { Edit2, Trash2, MapPin, Check, GripVertical, Car, Bus, Footprints, Clock, Plus, StickyNote, Plane, BedDouble } from "lucide-react";
import { useState } from "react";

interface PlaceCardProps {
    place: Place;
    previousPlace?: Place;
    item: ItineraryItem;
    isSelected: boolean;
    isDragging: boolean;
    onToggleSelection: () => void;
    onEdit: () => void;
    onRemove: () => void;
    onCardClick?: () => void;
}

export function PlaceCard({ place, previousPlace, item, isSelected, isDragging, onToggleSelection, onEdit, onRemove, onCardClick }: PlaceCardProps) {
    const [travelMode, setTravelMode] = useState<'driving' | 'transit' | 'walking'>('driving');

    // Mock Travel Time Calculation
    const getTravelTime = () => {
        if (!previousPlace || !previousPlace.lat || !previousPlace.lng || !place.lat || !place.lng) return "20 min";

        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(place.lat - previousPlace.lat);
        const dLng = deg2rad(place.lng - previousPlace.lng);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(previousPlace.lat)) * Math.cos(deg2rad(place.lat)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km

        // Base speed (km/h)
        let speed = 25; // Driving
        if (travelMode === 'walking') speed = 5;
        if (travelMode === 'transit') speed = 15;

        const time = Math.round((d / speed) * 60);
        return time < 1 ? "1 min" : `${time} min`;
    }

    function deg2rad(deg: number) {
        return deg * (Math.PI / 180)
    }

    return (
        <div className="mb-4 group">
            {previousPlace && !isDragging && (
                <div className="flex flex-col items-center justify-center -mt-3 -mb-3 relative z-0 h-16">
                    <div className="w-0.5 h-full bg-accent/50 absolute top-0 bottom-0"></div>
                    <div className="bg-surface border border-accent rounded-full pl-1 pr-3 py-1 flex items-center gap-2 relative z-10 shadow-sm hover:border-primary/50 transition-colors">
                        <div className="flex bg-accent/10 rounded-full p-0.5">
                            <button onClick={() => setTravelMode('driving')} className={`p-1 rounded-full ${travelMode === 'driving' ? 'bg-white shadow text-primary' : 'text-muted hover:text-text'}`} title="Driving">
                                <Car size={12} />
                            </button>
                            <button onClick={() => setTravelMode('transit')} className={`p-1 rounded-full ${travelMode === 'transit' ? 'bg-white shadow text-primary' : 'text-muted hover:text-text'}`} title="Transit">
                                <Bus size={12} />
                            </button>
                            <button onClick={() => setTravelMode('walking')} className={`p-1 rounded-full ${travelMode === 'walking' ? 'bg-white shadow text-primary' : 'text-muted hover:text-text'}`} title="Walking">
                                <Footprints size={12} />
                            </button>
                        </div>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-wider">
                            {getTravelTime()}
                        </span>
                    </div>
                </div>
            )}

            {/* Flight Item - Simple Bar */}
            {place.type === 'flight' && (
                <div
                    onClick={onCardClick}
                    className={`bg-sky-50 rounded-lg border border-sky-200 p-2 flex items-center gap-3 relative z-10 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="bg-sky-100 p-1.5 rounded-full text-sky-600 shrink-0">
                        <Plane size={14} />
                    </div>
                    <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                        <div>
                            <span className="font-bold text-sm text-sky-900">{place.name}</span>
                            <div className="text-xs text-sky-700 flex gap-2">
                                <span>{item.startTime} - {item.endTime}</span>
                                <span>{place.address}</span>
                            </div>
                        </div>
                    </div>
                    {/* Simplified Actions for Flight (Hover only) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-sky-400 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                    </div>
                </div>
            )}

            {/* Lodging Item - Simple Bar */}
            {place.type === 'lodging' && (
                <div
                    onClick={onCardClick}
                    className={`bg-indigo-50 rounded-lg border border-indigo-200 p-2 flex items-center gap-3 relative z-10 cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                >
                    <div className="bg-indigo-100 p-1.5 rounded-full text-indigo-600 shrink-0">
                        <BedDouble size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="font-bold text-sm text-indigo-900 block truncate">{place.name}</span>
                        <div className="text-xs text-indigo-700 flex gap-2">
                            {/* Assuming checkIn/checkOut are merged into place object by API as generic props, or we use item.notes */}
                            {/* Display Check-in/Check-out Label */}
                            {item.subtype === 'checkin' && <span className="font-bold">Check-in (3:00 PM)</span>}
                            {item.subtype === 'checkout' && <span className="font-bold">Check-out (11:00 AM)</span>}
                            {!item.subtype && (
                                <>
                                    {place.checkIn && <span>Check-in: {place.checkIn}</span>}
                                    {place.checkOut && <span>Check-out: {place.checkOut}</span>}
                                    {!(place.checkIn || place.checkOut) && <span>Lodging Details</span>}
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="text-indigo-400 hover:text-primary p-1"><Edit2 size={12} /></button>
                        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-indigo-400 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                    </div>
                </div>
            )}

            {/* Standard Place Card */}
            {place.type !== 'flight' && place.type !== 'lodging' && (
                <div
                    onClick={onCardClick}
                    className={`bg-surface rounded-xl p-3 border transition-all relative z-10 cursor-pointer ${isSelected ? 'border-primary ring-1 ring-primary' : 'border-accent hover:border-primary/50'}`}
                >
                    <div className="flex gap-3 items-start">
                        {/* Drag Handle & Selection Column */}
                        <div className="flex flex-col gap-2 items-center mt-1">
                            <div className="text-muted/30 cursor-grab hover:text-muted">
                                <GripVertical size={16} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-primary border-primary text-white' : 'border-gray-300 hover:border-primary'}`}
                            >
                                {isSelected && <Check size={12} />}
                            </button>
                        </div>

                        {/* Image */}
                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0 mt-1">
                            {place.image ? (
                                <img src={place.image} alt={place.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted">
                                    <MapPin size={24} />
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1">
                            <h4 className="font-bold text-text truncate text-sm">{place.name}</h4>
                            <p className="text-xs text-muted capitalize mb-2">{place.type}</p>

                            <div className="flex flex-wrap gap-2">
                                {/* Time Display/Add */}
                                {item.startTime ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-colors"
                                    >
                                        <Clock size={10} />
                                        {item.startTime} {item.endTime ? `- ${item.endTime}` : ''}
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        className="text-[10px] font-bold text-primary/70 hover:text-primary bg-accent/20 hover:bg-accent/40 px-2 py-1 rounded flex items-center gap-1 transition-colors border border-accent/50"
                                    >
                                        <Plus size={10} /> Add Time
                                    </button>
                                )}

                                {/* Note Display/Add */}
                                {item.notes ? (
                                    <div className="w-full mt-1 text-xs text-text/80 bg-accent/20 p-2 rounded-md italic border-l-2 border-primary/50 flex gap-2">
                                        <StickyNote size={12} className="shrink-0 text-muted mt-0.5" />
                                        <span>{`"${item.notes}"`}</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        className="text-[10px] font-bold text-primary/70 hover:text-primary bg-accent/20 hover:bg-accent/40 px-2 py-1 rounded flex items-center gap-1 transition-colors border border-accent/50"
                                    >
                                        <Plus size={10} /> Add Note
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Actions Column (Vertically Stacked) */}
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                className="p-1.5 text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Remove"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
