from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from api.models import (
    RestaurantMaster, RestaurantCuisine, RestaurantCategory,
    RestaurantMenu, AddonGroup, Addon, MenuItemAddonGroup
)
from api.restaurent.menue_serializers import (
    RestaurantMasterSerializer, RestaurantCuisineSerializer, RestaurantCategorySerializer,
    RestaurantMenuSerializer, AddonGroupSerializer, AddonSerializer,
    MenuItemAddonGroupSerializer, RestaurantMenuDetailSerializer
)

# Simple permission class - REMOVE for testing, you can add proper authentication later
class AllowAnyPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return True
    
    def has_object_permission(self, request, view, obj):
        return True

class RestaurantCuisineViewSet(viewsets.ModelViewSet):
    """ViewSet for managing cuisines"""
    queryset = RestaurantCuisine.objects.all()
    serializer_class = RestaurantCuisineSerializer
    permission_classes = [permissions.AllowAny]  # Change to AllowAny for testing
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        cuisine = self.get_object()
        cuisine.is_active = not cuisine.is_active
        cuisine.save()
        return Response({'status': 'success', 'is_active': cuisine.is_active})

class RestaurantCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for managing categories"""
    queryset = RestaurantCategory.objects.all()
    serializer_class = RestaurantCategorySerializer
    permission_classes = [permissions.AllowAny]  # Change to AllowAny for testing
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, pk=None):
        category = self.get_object()
        category.is_active = not category.is_active
        category.save()
        return Response({'status': 'success', 'is_active': category.is_active})

class RestaurantMenuViewSet(viewsets.ModelViewSet):
    """ViewSet for managing restaurant menu items"""
    serializer_class = RestaurantMenuSerializer
    permission_classes = [permissions.AllowAny]  # Change to AllowAny for testing
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'availability', 'food_type', 'discount_active']
    search_fields = ['item_name', 'description']
    ordering_fields = ['item_name', 'item_price', 'created_at']
    
    def get_queryset(self):
        restaurant_id = self.kwargs.get('restaurant_id')
        return RestaurantMenu.objects.filter(
            restaurant_id=restaurant_id
        ).select_related('category', 'restaurant').prefetch_related('cuisines')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RestaurantMenuDetailSerializer
        return RestaurantMenuSerializer
    
    def perform_create(self, serializer):
        restaurant_id = self.kwargs.get('restaurant_id')
        restaurant = get_object_or_404(
            RestaurantMaster, 
            restaurant_id=restaurant_id
        )
        
        # Handle image upload
        item_image = self.request.FILES.get('item_image')
        
        # Get cuisines data
        cuisines_data = self.request.data.getlist('cuisines[]') or []
        if not cuisines_data:
            cuisines_data = self.request.data.get('cuisines', [])
            if isinstance(cuisines_data, str):
                cuisines_data = cuisines_data.split(',')
        
        serializer.save(
            restaurant=restaurant,
            item_image=item_image,
            cuisines_data=[int(cid) for cid in cuisines_data if cid]
        )
    
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Handle partial update
        partial = kwargs.pop('partial', False)
        data = request.data.copy()
        
        # Handle image separately if provided
        item_image = request.FILES.get('item_image')
        if item_image:
            data['item_image'] = item_image
        elif 'item_image' in data and data['item_image'] is None:
            # Clear image if explicitly set to null
            instance.item_image = None
        
        # Handle cuisines array
        cuisines_data = request.data.getlist('cuisines[]') or request.data.get('cuisines', [])
        if cuisines_data:
            if isinstance(cuisines_data, str):
                cuisines_data = cuisines_data.split(',')
            data['cuisines_data'] = [int(cid) for cid in cuisines_data if cid]
        
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def toggle_availability(self, request, restaurant_id=None, pk=None):
        menu_item = self.get_object()
        menu_item.availability = not menu_item.availability
        menu_item.save()
        return Response({
            'status': 'success', 
            'availability': menu_item.availability
        })
    
    @action(detail=True, methods=['patch'])
    def toggle_discount(self, request, restaurant_id=None, pk=None):
        menu_item = self.get_object()
        menu_item.discount_active = 1 if menu_item.discount_active == 0 else 0
        menu_item.save()
        return Response({
            'status': 'success', 
            'discount_active': menu_item.discount_active
        })
    
    @action(detail=True, methods=['patch'])
    def toggle_bogo(self, request, restaurant_id=None, pk=None):
        menu_item = self.get_object()
        menu_item.buy_one_get_one_free = not menu_item.buy_one_get_one_free if menu_item.buy_one_get_one_free is not None else True
        menu_item.save()
        return Response({
            'status': 'success', 
            'buy_one_get_one_free': menu_item.buy_one_get_one_free
        })
    
    @action(detail=True, methods=['post'])
    def add_addon_group(self, request, restaurant_id=None, pk=None):
        """Add an addon group to menu item"""
        menu_item = self.get_object()
        addon_group_id = request.data.get('addon_group_id')
        is_required = request.data.get('is_required', False)
        
        if not addon_group_id:
            return Response(
                {'error': 'addon_group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        addon_group = get_object_or_404(
            AddonGroup, 
            id=addon_group_id, 
            restaurant_id=restaurant_id
        )
        
        # Check if relationship already exists
        if MenuItemAddonGroup.objects.filter(
            menu_item=menu_item, 
            addon_group=addon_group
        ).exists():
            return Response(
                {'error': 'Addon group already added to this menu item'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        menu_item_addon = MenuItemAddonGroup.objects.create(
            menu_item=menu_item,
            addon_group=addon_group,
            is_required=is_required
        )
        
        serializer = MenuItemAddonGroupSerializer(menu_item_addon)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def remove_addon_group(self, request, restaurant_id=None, pk=None):
        """Remove an addon group from menu item"""
        menu_item = self.get_object()
        addon_group_id = request.data.get('addon_group_id')
        
        if not addon_group_id:
            return Response(
                {'error': 'addon_group_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        menu_item_addon = get_object_or_404(
            MenuItemAddonGroup,
            menu_item=menu_item,
            addon_group_id=addon_group_id
        )
        
        menu_item_addon.delete()
        return Response({'status': 'success'}, status=status.HTTP_204_NO_CONTENT)

class AddonGroupViewSet(viewsets.ModelViewSet):
    """ViewSet for managing addon groups"""
    serializer_class = AddonGroupSerializer
    permission_classes = [permissions.AllowAny]  # Change to AllowAny for testing
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        restaurant_id = self.kwargs.get('restaurant_id')
        return AddonGroup.objects.filter(
            restaurant_id=restaurant_id
        ).prefetch_related('addons')
    
    def perform_create(self, serializer):
        restaurant_id = self.kwargs.get('restaurant_id')
        restaurant = get_object_or_404(
            RestaurantMaster, 
            restaurant_id=restaurant_id
        )
        
        # Get addons data from request
        addons_data = self.request.data.get('addons_data', [])
        
        # Ensure addons_data is a list
        if not isinstance(addons_data, list):
            addons_data = []
        
        # Create addon group with addons
        with transaction.atomic():
            addon_group = AddonGroup.objects.create(
                restaurant=restaurant,
                name=self.request.data.get('name'),
                description=self.request.data.get('description', ''),
                allow_multiple_selection=self.request.data.get('allow_multiple_selection', False),
                min_selection=self.request.data.get('min_selection', 0),
                max_selection=self.request.data.get('max_selection', 1),
                allow_multiple_quantity=self.request.data.get('allow_multiple_quantity', False),
                min_quantity=self.request.data.get('min_quantity', 1),
                max_quantity=self.request.data.get('max_quantity', 10),
                is_active=self.request.data.get('is_active', True)
            )
            
            # Create addons
            for addon_data in addons_data:
                Addon.objects.create(
                    group=addon_group,
                    name=addon_data.get('name'),
                    price=float(addon_data.get('price', 0)),
                    dietary_type=addon_data.get('dietary_type', 'Veg'),
                    is_active=addon_data.get('is_active', True)
                )
        
        # Return the created instance through serializer
        serializer.instance = addon_group
    
    def create(self, request, *args, **kwargs):
        # Override create to handle the response properly
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_update(self, serializer):
        # Get addons data from request
        addons_data = self.request.data.get('addons_data')
        
        with transaction.atomic():
            # Update addon group
            instance = serializer.save()
            
            # Handle addons update if provided
            if addons_data is not None:
                self._update_addons(instance, addons_data)
    
    def _update_addons(self, addon_group, addons_data):
        """Helper method to update addons"""
        existing_addon_ids = set(addon_group.addons.values_list('id', flat=True))
        updated_addon_ids = set()
        
        # Update or create addons
        for addon_data in addons_data:
            addon_id = addon_data.get('id')
            
            if addon_id and addon_group.addons.filter(id=addon_id).exists():
                # Update existing addon
                addon = addon_group.addons.get(id=addon_id)
                addon.name = addon_data.get('name', addon.name)
                addon.price = float(addon_data.get('price', addon.price))
                addon.dietary_type = addon_data.get('dietary_type', addon.dietary_type)
                addon.is_active = addon_data.get('is_active', addon.is_active)
                addon.save()
                updated_addon_ids.add(addon_id)
            else:
                # Create new addon
                Addon.objects.create(
                    group=addon_group,
                    name=addon_data.get('name'),
                    price=float(addon_data.get('price', 0)),
                    dietary_type=addon_data.get('dietary_type', 'Veg'),
                    is_active=addon_data.get('is_active', True)
                )
        
        # Delete addons not in the updated list
        addons_to_delete = existing_addon_ids - updated_addon_ids
        addon_group.addons.filter(id__in=addons_to_delete).delete()
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, restaurant_id=None, pk=None):
        addon_group = self.get_object()
        addon_group.is_active = not addon_group.is_active
        addon_group.save()
        return Response({
            'status': 'success', 
            'is_active': addon_group.is_active
        })

class AddonViewSet(viewsets.ModelViewSet):
    """ViewSet for managing individual addons"""
    serializer_class = AddonSerializer
    permission_classes = [permissions.AllowAny]  # Change to AllowAny for testing
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active', 'dietary_type']
    search_fields = ['name']
    
    def get_queryset(self):
        restaurant_id = self.kwargs.get('restaurant_id')
        group_id = self.kwargs.get('group_id')
        
        return Addon.objects.filter(
            group_id=group_id,
            group__restaurant_id=restaurant_id
        )
    
    def perform_create(self, serializer):
        group_id = self.kwargs.get('group_id')
        restaurant_id = self.kwargs.get('restaurant_id')
        
        addon_group = get_object_or_404(
            AddonGroup, 
            id=group_id,
            restaurant_id=restaurant_id
        )
        
        serializer.save(group=addon_group)
    
    @action(detail=True, methods=['patch'])
    def toggle_status(self, request, restaurant_id=None, group_id=None, pk=None):
        addon = self.get_object()
        addon.is_active = not addon.is_active
        addon.save()
        return Response({
            'status': 'success', 
            'is_active': addon.is_active
        })