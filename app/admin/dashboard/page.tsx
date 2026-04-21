'use client';

import { useState, useEffect } from 'react';
import { Container } from '@/components/layouts/container';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, DollarSign, Trash2, UserCircle, Phone, Mail, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface Ride {
  id: string;
  originAddress: string;
  destinationAddress: string;
  status: string;
  fare: number | null;
  createdAt: string;
  driver?: { name: string } | null;
}

interface Driver {
  id: string;
  user: { name: string; email: string };
  status: string;
  subscription: { status: string } | null;
  averageRating: number;
  totalRides: number;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  totalRides: number;
}

export default function AdminDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [totalRides, setTotalRides] = useState(0);
  const [activeDrivers, setActiveDrivers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmType, setConfirmType] = useState<'driver' | 'client'>('driver');
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const fetchData = async () => {
    try {
      const [ridesRes, driversRes, clientsRes] = await Promise.all([
        fetch('/api/rides'),
        fetch('/api/drivers'),
        fetch('/api/clients'),
      ]);

      const ridesData = await ridesRes.json();
      const driversData = await driversRes.json();
      const clientsData = clientsRes.ok ? await clientsRes.json() : [];

      setRides(ridesData);
      setDrivers(driversData);
      setClients(clientsData);

      // Calculate metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaysRides = ridesData.filter(
        (r: Ride) => new Date(r.createdAt) >= today
      ).length;
      setTotalRides(todaysRides);

      const active = driversData.filter((d: Driver) => d.status === 'online').length;
      setActiveDrivers(active);

      const revenue = ridesData.reduce(
        (sum: number, ride: Ride) => sum + (ride.fare || 0),
        0
      );
      setTotalRevenue(revenue);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;

    setDeletingId(selectedDriver.id);
    try {
      const response = await fetch('/api/drivers/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: selectedDriver.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar conductor');
        setDeletingId(null);
        return;
      }

      toast.success(`Conductor ${selectedDriver.user.name} eliminado exitosamente`);
      setShowConfirm(false);
      setSelectedDriver(null);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar conductor');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    setDeletingId(selectedClient.id);
    try {
      const response = await fetch('/api/clients/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: selectedClient.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || 'Error al eliminar cliente');
        setDeletingId(null);
        return;
      }

      toast.success(`Cliente ${selectedClient.name} eliminado exitosamente`);
      setShowConfirm(false);
      setSelectedClient(null);
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar cliente');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Container>
      <div className="space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Viajes Hoy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRides}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conductores Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeDrivers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="rides" className="w-full">
              <TabsList>
                <TabsTrigger value="rides">Viajes Recientes</TabsTrigger>
                <TabsTrigger value="drivers">Conductores</TabsTrigger>
                <TabsTrigger value="clients">Clientes</TabsTrigger>
              </TabsList>

              {/* Rides Tab */}
              <TabsContent value="rides" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origen</TableHead>
                      <TableHead>Destino</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Tarifa</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rides.slice(0, 10).map((ride) => (
                      <TableRow key={ride.id}>
                        <TableCell className="text-sm">{ride.originAddress}</TableCell>
                        <TableCell className="text-sm">{ride.destinationAddress}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${
                              ride.status === 'COMPLETED'
                                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                : ride.status === 'IN_PROGRESS'
                                ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                : ride.status === 'ACCEPTED'
                                ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                                : 'bg-muted text-muted-foreground border-border'
                            }`}
                          >
                            {ride.status}
                          </Badge>
                        </TableCell>
                        <TableCell>${ride.fare?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell className="text-sm">{ride.driver?.name || 'Sin asignar'}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(ride.createdAt).toLocaleDateString('es-MX')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Drivers Tab */}
              <TabsContent value="drivers" className="mt-4">
                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {drivers.map((driver) => (
                    <div key={driver.id} className="glass-card rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-base">{driver.user.name}</p>
                          <p className="text-sm text-muted-foreground">{driver.user.email}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`${
                            driver.status === 'online'
                              ? 'bg-green-500/15 text-green-400 border-green-500/30'
                              : 'bg-muted text-muted-foreground border-border'
                          }`}
                        >
                          {driver.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span>{driver.averageRating.toFixed(1)} ⭐</span>
                        <span>{driver.totalRides} viajes</span>
                        <Badge
                          variant="outline"
                          className={`${
                            driver.subscription?.status === 'ACTIVE'
                              ? 'bg-green-500/15 text-green-400 border-green-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {driver.subscription?.status || 'Inactivo'}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedDriver(driver);
                          setConfirmType('driver');
                          setShowConfirm(true);
                        }}
                        disabled={deletingId === driver.id}
                        className="w-full flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingId === driver.id ? 'Eliminando...' : 'Eliminar conductor'}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Suscripción</TableHead>
                        <TableHead>Calificación</TableHead>
                        <TableHead>Viajes</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {drivers.map((driver) => (
                        <TableRow key={driver.id}>
                          <TableCell className="font-medium">{driver.user.name}</TableCell>
                          <TableCell className="text-sm">{driver.user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                driver.status === 'online'
                                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {driver.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${
                                driver.subscription?.status === 'ACTIVE'
                                  ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                  : 'bg-red-500/15 text-red-400 border-red-500/30'
                              }`}
                            >
                              {driver.subscription?.status || 'Inactivo'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {driver.averageRating.toFixed(1)} ⭐
                          </TableCell>
                          <TableCell className="text-sm">{driver.totalRides}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedDriver(driver);
                                setConfirmType('driver');
                                setShowConfirm(true);
                              }}
                              disabled={deletingId === driver.id}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingId === driver.id ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Clients Tab */}
              <TabsContent value="clients" className="mt-4">
                {/* Mobile: Cards */}
                <div className="md:hidden space-y-3">
                  {clients.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No hay clientes registrados</p>
                  )}
                  {clients.map((client) => (
                    <div key={client.id} className="glass-card rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                            <UserCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-base">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {client.phone || 'Sin teléfono'}
                        </span>
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {client.totalRides} viajes
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Registrado: {new Date(client.createdAt).toLocaleDateString('es-MX')}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedClient(client);
                          setConfirmType('client');
                          setShowConfirm(true);
                        }}
                        disabled={deletingId === client.id}
                        className="w-full flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deletingId === client.id ? 'Eliminando...' : 'Eliminar cliente'}
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Desktop: Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead>Viajes</TableHead>
                        <TableHead>Registro</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No hay clientes registrados
                          </TableCell>
                        </TableRow>
                      )}
                      {clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <UserCircle className="w-5 h-5 text-muted-foreground" />
                              {client.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{client.email}</TableCell>
                          <TableCell className="text-sm">{client.phone || '—'}</TableCell>
                          <TableCell className="text-sm">{client.totalRides}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(client.createdAt).toLocaleDateString('es-MX')}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedClient(client);
                                setConfirmType('client');
                                setShowConfirm(true);
                              }}
                              disabled={deletingId === client.id}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              {deletingId === client.id ? 'Eliminando...' : 'Eliminar'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirm && (selectedDriver || selectedClient) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-2xl shadow-lg p-6 border border-border max-w-md w-full mx-4">
            <h2 className="text-lg font-bold font-display mb-2">Confirmar eliminación</h2>
            {confirmType === 'driver' && selectedDriver && (
              <>
                <p className="text-muted-foreground mb-4">
                  ¿Estás seguro de que deseas eliminar al conductor <strong>{selectedDriver.user.name}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="text-sm text-muted-foreground mb-6">
                  Se eliminarán:
                  <ul className="list-disc list-inside mt-2">
                    <li>La cuenta del conductor</li>
                    <li>Todos sus viajes asociados</li>
                    <li>Sus suscripciones</li>
                    <li>Sus calificaciones</li>
                  </ul>
                </div>
              </>
            )}
            {confirmType === 'client' && selectedClient && (
              <>
                <p className="text-muted-foreground mb-4">
                  ¿Estás seguro de que deseas eliminar al cliente <strong>{selectedClient.name}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="text-sm text-muted-foreground mb-6">
                  Se eliminarán:
                  <ul className="list-disc list-inside mt-2">
                    <li>La cuenta del cliente</li>
                    <li>Todos sus viajes solicitados</li>
                    <li>Sus pagos registrados</li>
                    <li>Sus calificaciones y mensajes</li>
                  </ul>
                </div>
              </>
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirm(false);
                  setSelectedDriver(null);
                  setSelectedClient(null);
                }}
                disabled={deletingId !== null}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmType === 'driver' ? handleDeleteDriver : handleDeleteClient}
                disabled={deletingId !== null}
              >
                {deletingId ? 'Eliminando...' : confirmType === 'driver' ? 'Eliminar Conductor' : 'Eliminar Cliente'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
