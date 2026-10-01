import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShipmentRulesService } from './shipment-rules.service';
import { ShipmentsService } from './shipments.service';
import { ShipmentStatus } from './shipment-status.enum';

describe('ShipmentsService', () => {
  let service: ShipmentsService;

  const repositoryMock = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const shipmentRulesServiceMock = {
    ensureCanBeDispatched: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        {
          provide: getRepositoryToken(ShipmentEntity),
          useValue: repositoryMock,
        },
        {
          provide: ShipmentRulesService,
          useValue: shipmentRulesServiceMock,
        },
      ],
    }).compile();

    service = moduleRef.get(ShipmentsService);
  });

  // Caso 1: comprobar que el servicio existe
  it('is defined', () => {
    expect(service).toBeDefined();
  });

  // Caso 2: consultar todos los envíos
  it('returns all shipments', async () => {
    const shipments = [
      { id: 1, trackingCode: 'SHIP-1', destination: 'Cali' },
      { id: 2, trackingCode: 'SHIP-2', destination: 'Bogotá' },
    ] as ShipmentEntity[];

    repositoryMock.find.mockResolvedValue(shipments);

    const result = await service.findAll();

    expect(result).toEqual(shipments);
    expect(repositoryMock.find).toHaveBeenCalledTimes(1);
  });

  // Caso 3: encontrar un envío existente
  it('returns a shipment when the id exists', async () => {
    const shipment = {
      id: 7,
      trackingCode: 'SHIP-7',
      destination: 'Cali',
    } as ShipmentEntity;

    repositoryMock.findOneBy.mockResolvedValue(shipment);

    const result = await service.findOne(7);

    expect(result).toEqual(shipment);
    expect(repositoryMock.findOneBy).toHaveBeenCalledWith({ id: 7 });
  });

  // Caso 4: manejar un envío inexistente
  it('throws NotFoundException when the id does not exist', async () => {
    repositoryMock.findOneBy.mockResolvedValue(null);

    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // Caso 5:crear y guardar un envío
  it('creates and saves a shipment', async () => {
    const data = {
      trackingCode: 'SHIP-100',
      destination: 'Cali',
    };

    const createdEntity = {
      ...data,
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

   const savedEntity = {
  ...createdEntity,
  id: 1,
  } as ShipmentEntity;

    repositoryMock.create.mockReturnValue(createdEntity);
    repositoryMock.save.mockResolvedValue(savedEntity);

    const result = await service.create(data);

    expect(repositoryMock.create).toHaveBeenCalledWith({
      ...data,
      status: ShipmentStatus.CREATED,
    });
    expect(repositoryMock.save).toHaveBeenCalledWith(createdEntity);
    expect(result).toEqual(savedEntity);
  });

  // Caso 6 : despachar un envío válido
  it('dispatches and saves a valid shipment', async () => {
    const shipment = {
      id: 3,
      trackingCode: 'SHIP-3',
      destination: 'Cali',
      status: ShipmentStatus.CREATED,
    } as ShipmentEntity;

    const dispatchedShipment = {
      ...shipment,
      status: ShipmentStatus.DISPATCHED,
    } as ShipmentEntity;

    repositoryMock.findOneBy.mockResolvedValue(shipment);
    repositoryMock.save.mockResolvedValue(dispatchedShipment);

    const result = await service.dispatch(3);

    expect(shipmentRulesServiceMock.ensureCanBeDispatched).toHaveBeenCalledWith(
      shipment,
    );
    expect(repositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 3,
        status: ShipmentStatus.DISPATCHED,
      }),
    );
    expect(result).toEqual(dispatchedShipment);
  });
});