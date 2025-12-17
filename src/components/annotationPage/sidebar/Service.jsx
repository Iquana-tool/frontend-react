import React, {useEffect, useState} from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Switch,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
  FiberManualRecord as StatusIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

const StatusIndicator = ({ status }) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'busy':
        return <RefreshIcon className="animate-spin" color="primary" fontSize="small" />;
      case 'error':
        return <StatusIcon color="error" />;
      case 'ready':
        return <StatusIcon color="success" />;
      default:
        console.log("Rendered with unsupported status: " + status)
        return <StatusIcon color="secondary" fontSize="small" />;
    }
  };

  const getToolTip = () => {
    switch (status) {
      case 'busy':
        return <Tooltip title="Model is busy" color="primary"> {getStatusIcon()} </Tooltip>;
      case 'error':
        return <Tooltip title="Model not available" color="error"> {getStatusIcon()} </Tooltip>;
      case 'ready':
        return <Tooltip title="Model is ready" color="success"> {getStatusIcon()} </Tooltip>;
      default:
        console.log("Rendered with unsupported status: " + status)
        return <Tooltip title="Model is busy" color="secondary"> {getStatusIcon()} </Tooltip>;
    }
  }

  return (
    <Box display="flex" alignItems="center" ml={1}>
      {getToolTip()}
    </Box>
  );
};

const ModelInfo = ({ description, tags, isExpanded }) => {
  if (!isExpanded) return null;
  return (
    <Box sx={{ mb: 2, mt: 1 }}>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {description}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {tags.map((tag) => (
          <Chip key={tag} label={tag} size="small" />
        ))}
      </Stack>
    </Box>
  );
};

const ServiceCard = ({
  serviceName,
  models,
  isLoading,
  selectedModel,
  setSelectedModel,
  onModelSwitch,
  icon: Icon,
}) => {
  const [instantMode, setInstantMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState();

  const handleModelChange = (event) => {
    setSelectedId(event.target.value);
  };

  useEffect(() => {
    if (!selectedId || !models) {
      setSelectedId(models[0]?.id);
    }
    // Collect all logic for model id switch here!
    // Load new model from available models and set the state:
    const selected = models.find((model) => model.id === selectedId);
    setSelectedModel(selected);
    // Run dependent scripts like model loading here:

  }, [selectedId, setSelectedModel, models]);

  const handleInstantModeToggle = () => {
    setInstantMode(!instantMode);
  };

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Skeleton variant="text" width="60%" sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="100%" height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" width="40%" height={20} />
        </CardContent>
      </Card>
    );
  }

  if (!models || models.length === 0) {
    return (
      <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center">
            {Icon && <Icon fontSize="small" sx={{ mr: 1 }} />}
            <Typography variant="subtitle2" component="div" gutterBottom>
              {serviceName}
            </Typography>
            <StatusIndicator status={selectedModel?.model_status || "error"} />
          </Box>
          <Typography variant="body2" color="text.secondary">
            No models available.
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={instantMode}
                onChange={handleInstantModeToggle}
                color="primary"
                disabled
              />
            }
            label="Instant Mode"
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="outlined" sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={1}>
          <FormControl fullWidth sx={{ mb: 1 }}>
            <InputLabel>{serviceName} Model</InputLabel>
            <Select
              value={selectedModel?.id || models[0].id}
              label={`${serviceName} Model`}
              onChange={handleModelChange}
              size="small"
              variant="outlined"
            >
              {models.map((model) => (
                <MenuItem variant="subtitle3" key={model.id} value={model.id}>
                  {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {Icon && <Icon fontSize="small" sx={{ mr: 1 }} />}
          <StatusIndicator status={selectedModel?.model_status || "error"} />
        </Box>

        {selectedModel && (
          <>
            <Box display="flex" alignItems="center" mb={1}>
              <FormControlLabel
                control={
                  <Switch
                    checked={instantMode}
                    onChange={handleInstantModeToggle}
                    color="primary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="caption">Instant Mode</Typography>
                }
              />
              <IconButton
                size="small"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="subtitle2" sx={{ ml: 1 }}>
                Description
              </Typography>
            </Box>
            <Collapse in={expanded}>
              <ModelInfo
                description={selectedModel?.description}
                tags={selectedModel?.tags}
                isExpanded={expanded}
              />
            </Collapse>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ServiceCard;

